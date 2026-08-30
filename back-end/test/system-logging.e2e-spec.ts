/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { RolesGuard } from '../src/core/guards/roles.guard';
import { Reflector } from '@nestjs/core';
import { TransformInterceptor } from '../src/core/interceptors/transform.interceptor';
import { LoggingService } from '../src/core/logging/logging.service';
import { CompaniesService } from '../src/modules/companies/companies.service';
import * as fs from 'fs';

interface ErrorResponseBody {
  statusCode: number;
  message: string;
  stack?: string;
}

describe('System-Wide File Logging (e2e)', () => {
  let app: INestApplication;
  let loggingService: LoggingService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
      }),
    );

    const reflector = app.get(Reflector);
    app.useGlobalGuards(new RolesGuard(reflector));
    app.useGlobalInterceptors(new TransformInterceptor());

    loggingService = app.get(LoggingService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. Successful 200 request generates INFO in application log only', async () => {
    const res = await request(app.getHttpServer())
      .get('/companies')
      .set('x-user-role', 'platform_admin')
      .set('x-platform-admin-id', 'bootstrap');

    expect(res.status).toBe(200);

    const appLogPath = loggingService.getApplicationLogPath();
    expect(fs.existsSync(appLogPath)).toBe(true);

    // Wait a brief moment for async file append
    await new Promise((r) => setTimeout(r, 100));

    const appLogs = fs.readFileSync(appLogPath, 'utf8');
    expect(appLogs).toMatch(/INFO GET \/companies 200 \d+ms/);
  });

  it('2. Validation error generates WARN in application log and ERROR in error log', async () => {
    const res = await request(app.getHttpServer())
      .post('/plans')
      .set('x-user-role', 'platform_admin')
      .set('x-platform-admin-id', 'bootstrap')
      .send({}); // Missing required fields

    expect(res.status).toBe(400);

    await new Promise((r) => setTimeout(r, 100));

    const appLogPath = loggingService.getApplicationLogPath();
    const errLogPath = loggingService.getErrorLogPath();

    const appLogs = fs.readFileSync(appLogPath, 'utf8');
    expect(appLogs).toMatch(/WARN POST \/plans 400 \d+ms/);

    expect(fs.existsSync(errLogPath)).toBe(true);
    const errLogs = fs.readFileSync(errLogPath, 'utf8');
    expect(errLogs).toMatch(/ERROR POST \/plans 400 message=".*"/);
  });

  it('3. 404 Not Found error is logged to both application log and error log', async () => {
    const res = await request(app.getHttpServer())
      .get('/subscriptions/00000000-0000-0000-0000-000000000000')
      .set('x-user-role', 'platform_admin')
      .set('x-platform-admin-id', 'bootstrap');

    expect(res.status).toBe(404);

    await new Promise((r) => setTimeout(r, 100));

    const appLogPath = loggingService.getApplicationLogPath();
    const errLogPath = loggingService.getErrorLogPath();

    const appLogs = fs.readFileSync(appLogPath, 'utf8');
    expect(appLogs).toMatch(
      /WARN GET \/subscriptions\/00000000-0000-0000-0000-000000000000 404 \d+ms/,
    );

    const errLogs = fs.readFileSync(errLogPath, 'utf8');
    expect(errLogs).toMatch(
      /ERROR GET \/subscriptions\/00000000-0000-0000-0000-000000000000 404 message=".*"/,
    );
  });

  it('4. 403 Forbidden error is logged to both application log and error log', async () => {
    const res = await request(app.getHttpServer())
      .get('/role-assignments')
      .set('x-user-role', 'team_member')
      .set('x-user-email', 'employee@acme.com');

    expect(res.status).toBe(403);

    await new Promise((r) => setTimeout(r, 100));

    const appLogPath = loggingService.getApplicationLogPath();
    const errLogPath = loggingService.getErrorLogPath();

    const appLogs = fs.readFileSync(appLogPath, 'utf8');
    expect(appLogs).toMatch(/WARN GET \/role-assignments 403 \d+ms/);

    const errLogs = fs.readFileSync(errLogPath, 'utf8');
    expect(errLogs).toMatch(/ERROR GET \/role-assignments 403 message=".*"/);
  });

  it('5. Sensitive fields (password, token, secret) are never leaked in logs', async () => {
    const secretPass = 'SuperSecretPlainPassword999';
    const secretToken = 'secret-token-xyz-888';

    await request(app.getHttpServer()).post('/auth/login').send({
      email: 'nonexistent-user-12345@test.com',
      password: secretPass,
      token: secretToken,
    });

    await new Promise((r) => setTimeout(r, 100));

    const appLogPath = loggingService.getApplicationLogPath();
    const errLogPath = loggingService.getErrorLogPath();

    const appLogs = fs.readFileSync(appLogPath, 'utf8');
    expect(appLogs).not.toContain(secretPass);
    expect(appLogs).not.toContain(secretToken);

    if (fs.existsSync(errLogPath)) {
      const errLogs = fs.readFileSync(errLogPath, 'utf8');
      expect(errLogs).not.toContain(secretPass);
      expect(errLogs).not.toContain(secretToken);
    }
  });

  it('6. Multiple endpoints across different modules are covered system-wide', async () => {
    const endpoints = [
      '/companies',
      '/plans',
      '/platform-admin-users',
      '/subscriptions',
    ];

    for (const ep of endpoints) {
      await request(app.getHttpServer())
        .get(ep)
        .set('x-user-role', 'platform_admin')
        .set('x-platform-admin-id', 'bootstrap');
    }

    await new Promise((r) => setTimeout(r, 100));

    const appLogPath = loggingService.getApplicationLogPath();
    const appLogs = fs.readFileSync(appLogPath, 'utf8');

    for (const ep of endpoints) {
      expect(appLogs).toContain(`GET ${ep}`);
    }
  });

  it('7. Unexpected 500 error is logged with ERROR level in application log and stack trace in error log', async () => {
    const companiesService = app.get(CompaniesService);
    jest
      .spyOn(companiesService, 'findAll')
      .mockRejectedValueOnce(
        new Error('Database connection unexpectedly failed'),
      );

    const res = await request(app.getHttpServer())
      .get('/companies')
      .set('x-user-role', 'platform_admin')
      .set('x-platform-admin-id', 'bootstrap');

    expect(res.status).toBe(500);
    const body = res.body as ErrorResponseBody;
    expect(body.statusCode).toBe(500);
    expect(body.message).toBe('Internal server error');
    expect(body.stack).toBeUndefined(); // Never exposed in HTTP response

    await new Promise((r) => setTimeout(r, 100));

    const appLogPath = loggingService.getApplicationLogPath();
    const errLogPath = loggingService.getErrorLogPath();

    const appLogs = fs.readFileSync(appLogPath, 'utf8');
    expect(appLogs).toMatch(/ERROR GET \/companies 500 \d+ms/);

    const errLogs = fs.readFileSync(errLogPath, 'utf8');
    expect(errLogs).toMatch(
      /ERROR GET \/companies 500 message="Database connection unexpectedly failed" stack=".*"/,
    );
  });
});
