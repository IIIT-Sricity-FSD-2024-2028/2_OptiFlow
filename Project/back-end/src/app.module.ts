import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './core/database/database.module';
import { UsersModule } from './modules/users/users.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { EscalationsModule } from './modules/escalations/escalations.module';
import { EvidenceModule } from './modules/evidence/evidence.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { RolesModule } from './modules/roles/roles.module';
import { SubtasksModule } from './modules/subtasks/subtasks.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { ComplianceRulesModule } from './modules/compliance-rules/compliance-rules.module';
import { ComplianceViolationsModule } from './modules/compliance-violations/compliance-violations.module';

@Module({
  imports: [
    DatabaseModule,
    UsersModule,
    TasksModule,
    ProjectsModule,
    EscalationsModule,
    EvidenceModule,
    DepartmentsModule,
    RolesModule,
    SubtasksModule,
    AuditLogsModule,
    ComplianceRulesModule,
    ComplianceViolationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
