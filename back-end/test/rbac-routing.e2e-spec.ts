import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { RolesGuard } from '../src/core/guards/roles.guard';
import { Reflector } from '@nestjs/core';
import { TransformInterceptor } from '../src/core/interceptors/transform.interceptor';

describe('RBAC Routing & Multi-Tenant Security Matrix (e2e)', () => {
  let app: INestApplication;

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

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // =====================================================================
  // 1. RBAC ROUTING MATRIX ITERATION TEST SUITE
  // =====================================================================
  describe('POST /auth/login - Role Persona Redirect Matrix', () => {
    const personaMatrix = [
      {
        persona: 'Company Owner (CEO)',
        email: 'ceo@acme.com',
        password: 'password123',
        expectedRole: 'Company Owner',
        expectedTargetRoute: 'superuser/dashboard.html',
      },
      {
        persona: 'Company Owner (CTO)',
        email: 'cto@acme.com',
        password: 'password123',
        expectedRole: 'Company Owner',
        expectedTargetRoute: 'superuser/dashboard.html',
      },
      {
        persona: 'Access Governance (HR Manager)',
        email: 'hr@acme.com',
        password: 'password123',
        expectedRole: 'Access Governance',
        expectedTargetRoute: 'admin/hr/dashboard.html',
      },
      {
        persona: 'Process Admin',
        email: 'admin@acme.com',
        password: 'password123',
        expectedRole: 'Process Admin',
        expectedTargetRoute: 'superuser/processes.html',
      },
      {
        persona: 'Compliance Officer',
        email: 'compliance@acme.com',
        password: 'password123',
        expectedRole: 'Compliance Officer',
        expectedTargetRoute: 'admin/compliance/compliance_dashboard.html',
      },
      {
        persona: 'Project Manager',
        email: 'pm@acme.com',
        password: 'password123',
        expectedRole: 'Project Manager',
        expectedTargetRoute: 'admin/pm/pm-dashboard.html',
      },
      {
        persona: 'Team Lead',
        email: 'tl@acme.com',
        password: 'password123',
        expectedRole: 'Team Lead',
        expectedTargetRoute: 'enduser/tl-dashboard.html',
      },
      {
        persona: 'Team Member (Employee)',
        email: 'employee@acme.com',
        password: 'password123',
        expectedRole: 'Team Member',
        expectedTargetRoute: 'admin/pm/tasks.html',
      },
    ];

    personaMatrix.forEach((item) => {
      it(`should authenticate ${item.persona} (${item.email}) and return targetRoute "${item.expectedTargetRoute}"`, async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: item.email,
            password: item.password,
          })
          .expect((res) => {
            expect([200, 201]).toContain(res.status);
          });

        const body = response.body.data || response.body;

        expect(body.success).toBe(true);
        expect(body.targetRoute).toBe(item.expectedTargetRoute);
        expect(body.user).toBeDefined();
        expect(body.user.email.toLowerCase()).toBe(item.email.toLowerCase());
        expect(body.user.assignedRole).toBe(item.expectedRole);
      });
    });
  });

  // =====================================================================
  // 2. MULTI-TENANT ISOLATION SECURITY SUITE
  // =====================================================================
  describe('Multi-Tenant Data Isolation Guarding', () => {
    it('should reject unauthorized user attempting to perform restricted role assignment (403 Forbidden)', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'ceo@betallc.com',
          password: 'password123',
        })
        .expect((res) => {
          expect([200, 201]).toContain(res.status);
        });

      const betaUser = (loginRes.body.data || loginRes.body).user;
      expect(betaUser).toBeDefined();

      await request(app.getHttpServer())
        .post('/role-assignments')
        .set('x-user-role', 'guest')
        .set('x-user-email', betaUser.email)
        .set('x-company-id', 'acme-corp-id-unauthorized')
        .send({
          userId: betaUser.id,
          roleId: 'unauthorized-role-id',
        })
        .expect(403);
    });

    it('should prevent cross-company task data leakage for Beta LLC user', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'member1@betallc.com',
          password: 'password123',
        })
        .expect((res) => {
          expect([200, 201]).toContain(res.status);
        });

      const betaMember = (loginRes.body.data || loginRes.body).user;

      const tasksRes = await request(app.getHttpServer())
        .get('/tasks')
        .set('x-user-role', 'team_member')
        .set('x-user-id', betaMember.id)
        .set('x-company-id', betaMember.companyId)
        .expect(200);

      const tasks = tasksRes.body.data || tasksRes.body;
      expect(Array.isArray(tasks)).toBe(true);

      const acmeTasks = tasks.filter(
        (t: any) => t.companyId !== betaMember.companyId,
      );
      expect(acmeTasks.length).toBe(0);
    });
  });
});
