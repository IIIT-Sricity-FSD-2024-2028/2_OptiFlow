/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { RolesGuard } from '../src/core/guards/roles.guard';
import { Reflector } from '@nestjs/core';
import { TransformInterceptor } from '../src/core/interceptors/transform.interceptor';
import helmet from 'helmet';

describe('Helmet Security Configuration (e2e)', () => {
  let app: INestApplication;
  const allowedOrigins = [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

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

  it('1. GET /companies returns standard Helmet security headers', async () => {
    const res = await request(app.getHttpServer())
      .get('/companies')
      .set('x-user-role', 'platform_admin')
      .set('x-platform-admin-id', 'bootstrap');

    expect(res.status).toBe(200);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
    expect(res.headers['content-security-policy']).toBeDefined();
  });

  it('2. GET /companies with Origin header returns BOTH CORS and Helmet headers simultaneously', async () => {
    const res = await request(app.getHttpServer())
      .get('/companies')
      .set('Origin', 'http://localhost:5500')
      .set('x-user-role', 'platform_admin')
      .set('x-platform-admin-id', 'bootstrap');

    expect(res.status).toBe(200);
    // CORS headers
    expect(res.headers['access-control-allow-origin']).toBe(
      'http://localhost:5500',
    );
    expect(res.headers['access-control-allow-credentials']).toBe('true');

    // Helmet headers
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
    expect(res.headers['content-security-policy']).toBeDefined();
  });

  it('3. POST /auth/login returns Helmet security headers', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .set('Origin', 'http://localhost:5500')
      .send({
        email: 'employee@acme.com',
        password: 'password123',
      });

    expect(res.status).toBe(201);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['access-control-allow-origin']).toBe(
      'http://localhost:5500',
    );
  });
});
