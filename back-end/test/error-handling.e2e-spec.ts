/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */
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

describe('Global Error Handling (e2e)', () => {
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

  it('1. 404 Not Found on missing route returns safe JSON and logs to error file', async () => {
    const res = await request(app.getHttpServer())
      .get('/nonexistent-route-for-testing')
      .set('Origin', 'http://localhost:5500');

    expect(res.status).toBe(404);
    expect(res.body.statusCode).toBe(404);
    expect(res.body.path).toBe('/nonexistent-route-for-testing');
    expect(res.body.message).toBeDefined();

    // Security & CORS headers preserved on error
    expect(res.headers['access-control-allow-origin']).toBe(
      'http://localhost:5500',
    );
    expect(res.headers['x-content-type-options']).toBe('nosniff');

    // Verify error log entry
    const errorLogPath = loggingService.getErrorLogPath();
    expect(fs.existsSync(errorLogPath)).toBe(true);
    const content = fs.readFileSync(errorLogPath, 'utf8');
    expect(content).toContain('404');
    expect(content).toContain('/nonexistent-route-for-testing');
  });

  it('2. 400 Bad Request on DTO validation failure returns validation errors and logs to error file', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register-company')
      .send({
        companyLegalName: '',
        ownerEmail: 'not-an-email',
      });

    expect(res.status).toBe(400);
    expect(res.body.statusCode).toBe(400);
    expect(res.body.path).toBe('/auth/register-company');
    expect(res.body.message).toBeDefined();

    // Verify error log entry
    const errorLogPath = loggingService.getErrorLogPath();
    const content = fs.readFileSync(errorLogPath, 'utf8');
    expect(content).toContain('400');
    expect(content).toContain('/auth/register-company');
  });

  it('3. 401 Unauthorized on invalid login credentials returns safe JSON and logs to error file', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'nonexistent-user@invalid.com',
        password: 'wrongpassword',
      });

    expect(res.status).toBe(401);
    expect(res.body.statusCode).toBe(401);
    expect(res.body.path).toBe('/auth/login');
    expect(res.body.message).toBeDefined();

    // Verify error log entry
    const errorLogPath = loggingService.getErrorLogPath();
    const content = fs.readFileSync(errorLogPath, 'utf8');
    expect(content).toContain('401');
    expect(content).toContain('/auth/login');
  });

  it('4. 403 Forbidden on unauthorized role returns consistent error and logs to error file', async () => {
    const res = await request(app.getHttpServer())
      .get('/processes/templates')
      .set('x-user-role', 'team_member');

    expect(res.status).toBe(403);
    expect(res.body.statusCode).toBe(403);
    expect(res.body.path).toBe('/processes/templates');

    // Verify error log entry
    const errorLogPath = loggingService.getErrorLogPath();
    const content = fs.readFileSync(errorLogPath, 'utf8');
    expect(content).toContain('403');
    expect(content).toContain('/processes/templates');
  });

  it('5. 400 Bad Request on duplicate owner email during registration', async () => {
    const res = await request(app.getHttpServer())
      .post('/companies/register')
      .send({
        companyLegalName: 'Duplicate Test Corp',
        ownerFullName: 'Alice Vance',
        ownerEmail: 'ceo@acme.com',
        ownerPassword: 'Password123!',
        planName: 'Pro Enterprise',
      });

    expect(res.status).toBe(400);
    expect(res.body.statusCode).toBe(400);
    expect(res.body.path).toBe('/companies/register');

    // Verify error log entry
    const errorLogPath = loggingService.getErrorLogPath();
    const content = fs.readFileSync(errorLogPath, 'utf8');
    expect(content).toContain('400');
    expect(content).toContain('/companies/register');
  });
});
