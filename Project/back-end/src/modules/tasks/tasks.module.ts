import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { DatabaseModule } from '../../core/database/database.module';

@Module({
  imports: [DatabaseModule, AuditLogsModule],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
