import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './core/database/database.module';
import { PrismaModule } from './core/prisma/prisma.module';
import { LoggingModule } from './core/logging/logging.module';
import { LoggerMiddleware } from './core/middleware/logger.middleware';
import { TenantMiddleware } from './core/middleware/tenant.middleware';

// Platform
import { PlansModule } from './modules/plans/plans.module';
import { PlatformAdminUsersModule } from './modules/platform-admin-users/platform-admin-users.module';
import { PlatformModule } from './modules/platform/platform.module';
import { ExecutiveModule } from './modules/executive/executive.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { PlatformSupportAccessModule } from './modules/platform-support-access/platform-support-access.module';

// Identity & Access
import { AuthModule } from './modules/auth/auth.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { RoleTemplatesModule } from './modules/role-templates/role-templates.module';
import { RoleAssignmentsModule } from './modules/role-assignments/role-assignments.module';
import { RolesModule } from './modules/roles/roles.module';

// Org
import { BranchesModule } from './modules/branches/branches.module';
import { TeamsModule } from './modules/teams/teams.module';
import { UsersModule } from './modules/users/users.module';

// Work
import { ProjectsModule } from './modules/projects/projects.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { SubtasksModule } from './modules/subtasks/subtasks.module';
import { EscalationsModule } from './modules/escalations/escalations.module';

// Process
import { ProcessTemplatesModule } from './modules/process-templates/process-templates.module';
import { ProcessInstancesModule } from './modules/process-instances/process-instances.module';
import { ProcessInstanceStepsModule } from './modules/process-instance-steps/process-instance-steps.module';

// Compliance
import { ComplianceCategoriesModule } from './modules/compliance-categories/compliance-categories.module';
import { ComplianceRulesModule } from './modules/compliance-rules/compliance-rules.module';
import { ComplianceBindingsModule } from './modules/compliance-bindings/compliance-bindings.module';
import { ComplianceViolationsModule } from './modules/compliance-violations/compliance-violations.module';
import { EvidenceModule } from './modules/evidence/evidence.module';

// Cross-Cutting
import { CommentsModule } from './modules/comments/comments.module';
import { AttachmentsModule } from './modules/attachments/attachments.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

// RBAC Role-Gated Feature Controllers
import { MetricsModule } from './modules/metrics/metrics.module';
import { ProcessModule } from './modules/process/process.module';
import { GovernanceModule } from './modules/governance/governance.module';

import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    DatabaseModule,
    LoggingModule,

    PlansModule,
    PlatformAdminUsersModule,
    PlatformModule,
    ExecutiveModule,
    CompaniesModule,
    SubscriptionsModule,
    PlatformSupportAccessModule,

    AuthModule,
    PermissionsModule,
    RoleTemplatesModule,
    RoleAssignmentsModule,
    RolesModule,

    BranchesModule,
    TeamsModule,
    UsersModule,

    ProjectsModule,
    TasksModule,
    SubtasksModule,
    EscalationsModule,

    ProcessTemplatesModule,
    ProcessInstancesModule,
    ProcessInstanceStepsModule,

    ComplianceCategoriesModule,
    ComplianceRulesModule,
    ComplianceBindingsModule,
    ComplianceViolationsModule,
    EvidenceModule,

    CommentsModule,
    AttachmentsModule,
    AuditLogsModule,
    NotificationsModule,

    // RBAC Role-Gated Feature Controllers
    MetricsModule,
    ProcessModule,
    GovernanceModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware, TenantMiddleware).forRoutes('*');
  }
}
