import { Injectable } from '@nestjs/common';
import { DatabaseService, AuditLog } from '../../core/database/database.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';

@Injectable()
export class AuditLogsService {
  constructor(private readonly db: DatabaseService) {}

  findAll(): AuditLog[] { return this.db.audit_logs; }

  findByEntity(entityType: string, entityId: number): AuditLog[] {
    return this.db.audit_logs.filter(l => l.entity_type === entityType && l.entity_id === entityId);
  }

  findByUser(userId: number): AuditLog[] {
    return this.db.audit_logs.filter(l => l.performed_by === userId);
  }

  create(dto: CreateAuditLogDto): AuditLog {
    const newLog: AuditLog = {
      log_id: this.db.audit_logs.length ? Math.max(...this.db.audit_logs.map(l => l.log_id)) + 1 : 1,
      entity_id: dto.entity_id,
      entity_type: dto.entity_type,
      action: dto.action,
      performed_by: dto.performed_by ?? null,
      performed_at: new Date().toISOString(),
      ip_address: dto.ip_address ?? null,
      old_value: dto.old_value ?? null,
      new_value: dto.new_value ?? null,
    };
    this.db.audit_logs.push(newLog);
    return newLog;
  }
}
