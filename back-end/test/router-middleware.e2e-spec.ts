/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { RolesGuard } from '../src/core/guards/roles.guard';
import { Reflector } from '@nestjs/core';
import { TransformInterceptor } from '../src/core/interceptors/transform.interceptor';
import { LoggingService } from '../src/core/logging/logging.service';
import helmet from 'helmet';
import * as fs from 'fs';

describe('Router-Level Middleware (e2e)', () => {
  let app: INestApplication;
  let loggingService: LoggingService;
  const allowedOrigins = ['http://localhost:5500', 'http://127.0.0.1:5500'];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    loggingService = app.get(LoggingService);

    app.use(
      helmet({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https:'],
            styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
            imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
            connectSrc: ["'self'", 'http:', 'https:'],
          },
        },
        hsts: false,
      }),
    );

    app.enableCors({
      origin: allowedOrigins,
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'x-user-role',
        'x-user-id',
        'x-user-email',
        'x-company-id',
        'x-platform-admin-id',
        'Accept',
        'Origin',
        'X-Requested-With',
      ],
      credentials: true,
      optionsSuccessStatus: 204,
    });

    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
      }),
    );

    const reflector = app.get(Reflector);
    app.useGlobalGuards(new RolesGuard(reflector));
    app.useGlobalInterceptors(new TransformInterceptor());

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. Selected route (/users) executes router middleware and attaches X-Route-Processed: users', async () => {
    const res = await request(app.getHttpServer())
      .get('/users')
      .set('Origin', 'http://localhost:5500')
      .set('x-user-role', 'superuser')
      .set('x-company-id', 'test-company-id');

    expect(res.headers['x-route-processed']).toBe('users');

    // Security and CORS headers still co-exist
    expect(res.headers['access-control-allow-origin']).toBe(
      'http://localhost:5500',
    );
    expect(res.headers['x-content-type-options']).toBe('nosniff');

    // Application logging still records the request
    const appLogPath = loggingService.getApplicationLogPath();
    expect(fs.existsSync(appLogPath)).toBe(true);
    const content = fs.readFileSync(appLogPath, 'utf8');
    expect(content).toContain('/users');
  });

  it('2. Unrelated route (/auth/public-plans) does NOT have X-Route-Processed header', async () => {
    const res = await request(app.getHttpServer()).get('/auth/public-plans');

    expect(res.status).toBe(200);
    expect(res.headers['x-route-processed']).toBeUndefined();
  });

  it('3. Unrelated route (/companies) does NOT have X-Route-Processed header', async () => {
    const res = await request(app.getHttpServer())
      .get('/companies')
      .set('x-platform-admin-id', 'bootstrap');

    expect(res.status).toBe(200);
    expect(res.headers['x-route-processed']).toBeUndefined();
  });

  it('4. Unrelated route (/processes/templates) does NOT have X-Route-Processed header', async () => {
    const res = await request(app.getHttpServer())
      .get('/processes/templates')
      .set('x-user-role', 'Company Owner')
      .set('x-company-id', 'test-company-id');

    expect(res.headers['x-route-processed']).toBeUndefined();
  });
});
