import { Module } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogsController } from './audit-logs.controller';
import { DatabaseModule } from '../../core/database/database.module';

@Module({ imports: [DatabaseModule], controllers: [AuditLogsController], providers: [AuditLogsService] })
export class AuditLogsModule {}
