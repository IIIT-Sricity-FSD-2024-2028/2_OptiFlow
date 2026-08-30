/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { RolesGuard } from '../src/core/guards/roles.guard';
import { Reflector } from '@nestjs/core';
import { TransformInterceptor } from '../src/core/interceptors/transform.interceptor';

describe('CORS Security Configuration (e2e)', () => {
  let app: INestApplication;
  const allowedOrigins = ['http://localhost:5500', 'http://127.0.0.1:5500'];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

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

  it('1. GET request from allowed origin (http://localhost:5500) returns Access-Control-Allow-Origin', async () => {
    const res = await request(app.getHttpServer())
      .get('/companies')
      .set('Origin', 'http://localhost:5500')
      .set('x-user-role', 'platform_admin')
      .set('x-platform-admin-id', 'bootstrap');

    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe(
      'http://localhost:5500',
    );
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('2. GET request from unapproved origin does NOT return matching Access-Control-Allow-Origin', async () => {
    const res = await request(app.getHttpServer())
      .get('/companies')
      .set('Origin', 'http://unapproved-malicious-origin.com')
      .set('x-user-role', 'platform_admin')
      .set('x-platform-admin-id', 'bootstrap');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('3. Preflight OPTIONS request from allowed origin returns 204 with CORS headers', async () => {
    const res = await request(app.getHttpServer())
      .options('/companies')
      .set('Origin', 'http://localhost:5500')
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'x-user-role,x-platform-admin-id');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(
      'http://localhost:5500',
    );
    expect(res.headers['access-control-allow-methods']).toMatch(/GET/);
    expect(res.headers['access-control-allow-headers']).toMatch(/x-user-role/);
  });

  it('4. Preflight OPTIONS request from unapproved origin does NOT return Access-Control-Allow-Origin', async () => {
    const res = await request(app.getHttpServer())
      .options('/companies')
      .set('Origin', 'http://unapproved-malicious-origin.com')
      .set('Access-Control-Request-Method', 'GET');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('5. POST request with custom auth/tenant headers from allowed origin succeeds with CORS', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .set('Origin', 'http://localhost:5500')
      .send({
        email: 'employee@acme.com',
        password: 'password123',
      });

    expect(res.status).toBe(201);
    expect(res.headers['access-control-allow-origin']).toBe(
      'http://localhost:5500',
    );
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });
});
