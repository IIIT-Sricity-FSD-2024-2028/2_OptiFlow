import { Module } from '@nestjs/common';
import { EscalationsService } from './escalations.service';
import { EscalationsController } from './escalations.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [AuditLogsModule],
  controllers: [EscalationsController],
  providers: [EscalationsService],
})
export class EscalationsModule {}
