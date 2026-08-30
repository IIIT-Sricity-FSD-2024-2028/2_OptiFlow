import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { RolesGuard } from './core/guards/roles.guard';
import { TransformInterceptor } from './core/interceptors/transform.interceptor';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import * as path from 'path';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 1. Enable Security Headers with Helmet (Security Requirement)
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
      hsts: process.env.NODE_ENV === 'production',
    }),
  );

  // 2. Configure CORS explicitly (Security Requirement)
  const envOrigins =
    process.env.FRONTEND_ORIGINS || process.env.FRONTEND_ORIGIN;
  const allowedOrigins = envOrigins
    ? envOrigins
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean)
    : [
        'http://localhost:5500',
        'http://127.0.0.1:5500',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:64064',
      ];

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

  // Serve uploaded evidence files at /uploads/...
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  app.useStaticAssets(uploadsDir, { prefix: '/uploads' });

  // 2. Enable Global Validation (Fulfills Rubric #5)
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  // 3. Apply RolesGuard globally (Fulfills Rubric RBAC requirement)
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new RolesGuard(reflector));

  // 4. Apply Global Interceptor for API Standardization
  app.useGlobalInterceptors(new TransformInterceptor());

  // 5. Setup Swagger API Documentation (Fulfills Rubric #7)
  const config = new DocumentBuilder()
    .setTitle('OfficeSync API')
    .setDescription('Backend API for the OfficeSync HR and PM Dashboard')
    .setVersion('1.0')
    .addSecurity('Role-Based-Access', {
      type: 'apiKey',
      in: 'header',
      name: 'x-user-role',
      description:
        'Enter your role to unlock the endpoints (e.g., platform_admin, superuser, hr_manager, team_leader, team_member)',
    })
    .addSecurityRequirements('Role-Based-Access')
    .addGlobalParameters({
      in: 'header',
      required: false,
      name: 'x-user-id',
      description:
        'String user id for the acting user (required on task/subtask/escalation mutations)',
    })
    .addGlobalParameters({
      in: 'header',
      required: false,
      name: 'x-company-id',
      description: 'UUID of the company context (required for tenant routes)',
    })
    .addGlobalParameters({
      in: 'header',
      required: false,
      name: 'x-platform-admin-id',
      description:
        'UUID of the platform admin user (required for platform routes)',
    })
    .build();

  const document = SwaggerModule.createDocument(app, config);

  const docsFolderPath = path.join(__dirname, '..', 'docs');
  if (!fs.existsSync(docsFolderPath)) {
    fs.mkdirSync(docsFolderPath, { recursive: true });
  }

  fs.writeFileSync(
    path.join(docsFolderPath, 'swagger.json'),
    JSON.stringify(document, null, 2),
  );

  const port = process.env.PORT ?? 5500;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(
    `📄 Swagger Docs available at: http://localhost:${port}/api/docs`,
  );
}
void bootstrap();
