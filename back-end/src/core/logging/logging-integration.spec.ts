import { Test, TestingModule } from '@nestjs/testing';
import {
  Controller,
  Get,
  Post,
  Body,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  ValidationPipe,
  MiddlewareConsumer,
  Module,
  NestModule,
  INestApplication,
} from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';
import request from 'supertest';
import * as fs from 'fs';
import { LoggingModule } from './logging.module';
import { LoggingService } from './logging.service';
import { LoggerMiddleware } from '../middleware/logger.middleware';
import { GlobalExceptionFilter } from '../filters/global-exception.filter';

class CreatePlanDto {
  @IsNotEmpty()
  @IsString()
  name!: string;
}

@Controller('test-endpoints')
class TestLoggingController {
  @Get('success')
  getSuccess() {
    return { message: 'OK' };
  }

  @Post('validate')
  createPlan(@Body() dto: CreatePlanDto) {
    return { success: true, name: dto.name };
  }

  @Get('not-found')
  getNotFound() {
    throw new NotFoundException('Resource was not found');
  }

  @Get('forbidden')
  getForbidden() {
    throw new ForbiddenException('Access denied for this role');
  }

  @Get('server-error')
  getServerError() {
    throw new InternalServerErrorException('Database failure simulation');
  }
}

@Module({
  imports: [LoggingModule],
  controllers: [TestLoggingController],
})
class TestAppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}

describe('System-Wide Logging Integration', () => {
  let app: INestApplication;
  let loggingService: LoggingService;
  let todayAppLog: string;
  let todayErrorLog: string;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    loggingService = app.get(LoggingService);

    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter(loggingService));

    await app.init();

    todayAppLog = loggingService.getApplicationLogPath();
    todayErrorLog = loggingService.getErrorLogPath();
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. 2xx request generates application log entry with INFO level', async () => {
    const res = await request(
      app.getHttpServer() as unknown as Parameters<typeof request>[0],
    ).get('/test-endpoints/success');
    expect(res.status).toBe(200);

    await new Promise((r) => setTimeout(r, 100));

    expect(fs.existsSync(todayAppLog)).toBe(true);
    const content = fs.readFileSync(todayAppLog, 'utf8');
    expect(content).toMatch(/INFO GET \/test-endpoints\/success 200 \d+ms/);
  });

  it('2. 400 validation error logs to application log (WARN) and error log (ERROR) with sanitized fields', async () => {
    const res = await request(
      app.getHttpServer() as unknown as Parameters<typeof request>[0],
    )
      .post('/test-endpoints/validate')
      .send({
        password: 'SuperSecretPassword123!',
        token: 'secret-token-xyz',
      });

    expect(res.status).toBe(400);

    await new Promise((r) => setTimeout(r, 100));

    const appContent = fs.readFileSync(todayAppLog, 'utf8');
    expect(appContent).toMatch(
      /WARN POST \/test-endpoints\/validate 400 \d+ms/,
    );

    expect(fs.existsSync(todayErrorLog)).toBe(true);
    const errContent = fs.readFileSync(todayErrorLog, 'utf8');
    expect(errContent).toMatch(
      /ERROR POST \/test-endpoints\/validate 400 message=".*name should not be empty.*"/,
    );

    // Verify sensitive data not leaked
    expect(appContent).not.toContain('SuperSecretPassword123!');
    expect(errContent).not.toContain('SuperSecretPassword123!');
    expect(appContent).not.toContain('secret-token-xyz');
    expect(errContent).not.toContain('secret-token-xyz');
  });

  it('3. 404 Not Found logs to application log (WARN) and error log (ERROR)', async () => {
    const res = await request(
      app.getHttpServer() as unknown as Parameters<typeof request>[0],
    ).get('/test-endpoints/not-found');
    expect(res.status).toBe(404);

    await new Promise((r) => setTimeout(r, 100));

    const appContent = fs.readFileSync(todayAppLog, 'utf8');
    expect(appContent).toMatch(
      /WARN GET \/test-endpoints\/not-found 404 \d+ms/,
    );

    const errContent = fs.readFileSync(todayErrorLog, 'utf8');
    expect(errContent).toMatch(
      /ERROR GET \/test-endpoints\/not-found 404 message="Resource was not found"/,
    );
  });

  it('4. 403 Forbidden logs to application log (WARN) and error log (ERROR)', async () => {
    const res = await request(
      app.getHttpServer() as unknown as Parameters<typeof request>[0],
    ).get('/test-endpoints/forbidden');
    expect(res.status).toBe(403);

    await new Promise((r) => setTimeout(r, 100));

    const appContent = fs.readFileSync(todayAppLog, 'utf8');
    expect(appContent).toMatch(
      /WARN GET \/test-endpoints\/forbidden 403 \d+ms/,
    );

    const errContent = fs.readFileSync(todayErrorLog, 'utf8');
    expect(errContent).toMatch(
      /ERROR GET \/test-endpoints\/forbidden 403 message="Access denied for this role"/,
    );
  });

  it('5. 500 Server Error logs to application log (ERROR) and error log (ERROR) with stack trace', async () => {
    const res = await request(
      app.getHttpServer() as unknown as Parameters<typeof request>[0],
    ).get('/test-endpoints/server-error');
    expect(res.status).toBe(500);

    // Response must not expose internal stack
    expect((res.body as Record<string, unknown>).stack).toBeUndefined();

    await new Promise((r) => setTimeout(r, 100));

    const appContent = fs.readFileSync(todayAppLog, 'utf8');
    expect(appContent).toMatch(
      /ERROR GET \/test-endpoints\/server-error 500 \d+ms/,
    );

    const errContent = fs.readFileSync(todayErrorLog, 'utf8');
    expect(errContent).toMatch(
      /ERROR GET \/test-endpoints\/server-error 500 message="Database failure simulation"/,
    );
    expect(errContent).toContain('stack=');
  });

  it('6. Application restart preserves previous log entries and appends new ones', async () => {
    const beforeRestartAppSize = fs.readFileSync(todayAppLog, 'utf8').length;
    const beforeRestartErrSize = fs.readFileSync(todayErrorLog, 'utf8').length;

    // Simulate restart
    await app.close();

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    const restartedLoggingService = app.get(LoggingService);
    app.useGlobalFilters(new GlobalExceptionFilter(restartedLoggingService));
    await app.init();

    // Verify files not truncated
    expect(fs.readFileSync(todayAppLog, 'utf8').length).toBe(
      beforeRestartAppSize,
    );
    expect(fs.readFileSync(todayErrorLog, 'utf8').length).toBe(
      beforeRestartErrSize,
    );

    // Make new request
    await request(
      app.getHttpServer() as unknown as Parameters<typeof request>[0],
    ).get('/test-endpoints/success');
    await new Promise((r) => setTimeout(r, 100));

    expect(fs.readFileSync(todayAppLog, 'utf8').length).toBeGreaterThan(
      beforeRestartAppSize,
    );
  });
});
