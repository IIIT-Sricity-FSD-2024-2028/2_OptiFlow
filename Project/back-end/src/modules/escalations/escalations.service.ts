import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService, Escalation } from '../../core/database/database.service';
import { CreateEscalationDto } from './dto/create-escalation.dto';
import { UpdateEscalationDto } from './dto/update-escalation.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

function toEscalationPayload(e: Escalation): object {
  return { ...e } as unknown as object;
}

@Injectable()
export class EscalationsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  findAll(): Escalation[] {
    return this.db.escalations;
  }

  findOne(id: number): Escalation {
    const escalation = this.db.escalations.find((e) => e.escalation_id === id);
    if (!escalation) throw new NotFoundException(`Escalation with ID ${id} not found`);
    return escalation;
  }

  create(dto: CreateEscalationDto, actorUserId: number): Escalation {
    const newEscalation: Escalation = {
      escalation_id: this.db.escalations.length
        ? Math.max(...this.db.escalations.map((e) => e.escalation_id)) + 1
        : 1,
      task_id: dto.task_id,
      project_id: dto.project_id,
      reported_by: dto.reported_by,
      target_manager_id: dto.target_manager_id,
      title: dto.title,
      description: dto.description ?? '',
      blocker_type: dto.blocker_type ?? 'General',
      priority: dto.priority ?? 'High',
      status: 'Open',
      created_at: new Date().toISOString(),
      resolved_at: null,
    };
    this.db.escalations.push(newEscalation);
    this.auditLogs.create({
      entity_id: newEscalation.escalation_id,
      entity_type: 'Escalation',
      action: 'CREATED',
      performed_by: actorUserId,
      new_value: toEscalationPayload(newEscalation),
    });
    return newEscalation;
  }

  update(id: number, dto: UpdateEscalationDto, actorUserId: number): Escalation {
    const index = this.db.escalations.findIndex((e) => e.escalation_id === id);
    if (index === -1) throw new NotFoundException(`Escalation ${id} not found`);
    const before = { ...this.db.escalations[index] };
    const merged: Escalation = { ...before };

    const dtoKeys = Object.keys(dto) as (keyof UpdateEscalationDto)[];
    let touched = false;
    for (const key of dtoKeys) {
      const v = dto[key];
      if (v !== undefined) {
        (merged as unknown as Record<string, unknown>)[key as string] = v as unknown;
        touched = true;
      }
    }
    if (!touched) {
      return before;
    }

    const materiallyChanged = Object.keys(dto).some((k) => {
      const key = k as keyof UpdateEscalationDto;
      return (
        dto[key] !== undefined &&
        (before as unknown as Record<string, unknown>)[k] !== (merged as unknown as Record<string, unknown>)[k]
      );
    });
    if (!materiallyChanged) {
      return before;
    }

    this.db.escalations[index] = merged;

    const statusProvided = dto.status !== undefined;
    const statusChanged = statusProvided && dto.status !== before.status;
    const action = statusChanged ? 'STATUS_CHANGED' : 'UPDATED';

    this.auditLogs.create({
      entity_id: id,
      entity_type: 'Escalation',
      action,
      performed_by: actorUserId,
      old_value: toEscalationPayload(before),
      new_value: toEscalationPayload(merged),
    });

    return merged;
  }

  remove(id: number, actorUserId: number): void {
    const index = this.db.escalations.findIndex((e) => e.escalation_id === id);
    if (index === -1) throw new NotFoundException(`Escalation ${id} not found`);
    const before = { ...this.db.escalations[index] };
    this.auditLogs.create({
      entity_id: id,
      entity_type: 'Escalation',
      action: 'DELETED',
      performed_by: actorUserId,
      old_value: toEscalationPayload(before),
    });
    this.db.escalations.splice(index, 1);
  }
}
