import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService, Subtask } from '../../core/database/database.service';
import { CreateSubtaskDto } from './dto/create-subtask.dto';
import { UpdateSubtaskDto } from './dto/update-subtask.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

const CAN_DELEGATE = new Set(['team_leader', 'project_manager']);

function toSubtaskPayload(s: Subtask): object {
  return { ...s } as unknown as object;
}

@Injectable()
export class SubtasksService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  findAll(): Subtask[] {
    return this.db.subtasks;
  }

  findByTask(taskId: number): Subtask[] {
    return this.db.subtasks.filter((s) => s.task_id === taskId);
  }

  findOne(id: number): Subtask {
    const subtask = this.db.subtasks.find((s) => s.subtask_id === id);
    if (!subtask)
      throw new NotFoundException(`Subtask with ID ${id} not found`);
    return subtask;
  }

  create(dto: CreateSubtaskDto, actorUserId: number): Subtask {
    const newSubtask: Subtask = {
      subtask_id: this.db.subtasks.length
        ? Math.max(...this.db.subtasks.map((s) => s.subtask_id)) + 1
        : 1,
      task_id: dto.task_id,
      title: dto.title,
      description: dto.description ?? '',
      created_by: dto.created_by ?? actorUserId,
      assigned_to: dto.assigned_to,
      status: dto.status ?? 'Pending',
      estimated_hours: dto.estimated_hours ?? 0,
      due_date: dto.due_date ?? null,
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.db.subtasks.push(newSubtask);
    this.auditLogs.create({
      entity_id: newSubtask.subtask_id,
      entity_type: 'Subtask',
      action: 'CREATED',
      performed_by: actorUserId,
      new_value: toSubtaskPayload(newSubtask),
    });
    return newSubtask;
  }

  update(
    id: number,
    dto: UpdateSubtaskDto,
    actorUserId: number,
    actorRole: string,
  ): Subtask {
    const index = this.db.subtasks.findIndex((s) => s.subtask_id === id);
    if (index === -1) throw new NotFoundException(`Subtask ${id} not found`);
    const before = { ...this.db.subtasks[index] };
    const merged: Subtask = { ...before };

    const dtoKeys = Object.keys(dto) as (keyof UpdateSubtaskDto)[];
    let touched = false;
    for (const key of dtoKeys) {
      const v = dto[key];
      if (v !== undefined) {
        (merged as any)[key as string] = v;
        touched = true;
      }
    }
    if (!touched) {
      return before;
    }

    if (
      dto.assigned_to !== undefined &&
      dto.assigned_to !== before.assigned_to &&
      !CAN_DELEGATE.has(actorRole)
    ) {
      throw new ForbiddenException(
        'Only team leaders or project managers may delegate or reassign subtasks.',
      );
    }

    merged.updated_at = new Date().toISOString();

    const materiallyChanged = Object.keys(dto).some((k) => {
      const key = k as keyof UpdateSubtaskDto;
      return (
        dto[key] !== undefined &&
        (before as unknown as Record<string, unknown>)[k] !==
          (merged as unknown as Record<string, unknown>)[k]
      );
    });
    if (!materiallyChanged) {
      return before;
    }

    this.db.subtasks[index] = merged;

    const statusProvided = dto.status !== undefined;
    const statusChanged = statusProvided && dto.status !== before.status;
    const action = statusChanged ? 'STATUS_CHANGED' : 'UPDATED';

    this.auditLogs.create({
      entity_id: id,
      entity_type: 'Subtask',
      action,
      performed_by: actorUserId,
      old_value: toSubtaskPayload(before),
      new_value: toSubtaskPayload(merged),
    });

    return merged;
  }

  remove(id: number, actorUserId: number): void {
    const index = this.db.subtasks.findIndex((s) => s.subtask_id === id);
    if (index === -1) throw new NotFoundException(`Subtask ${id} not found`);
    const before = { ...this.db.subtasks[index] };
    this.auditLogs.create({
      entity_id: id,
      entity_type: 'Subtask',
      action: 'DELETED',
      performed_by: actorUserId,
      old_value: toSubtaskPayload(before),
    });
    this.db.subtasks.splice(index, 1);
  }
}
