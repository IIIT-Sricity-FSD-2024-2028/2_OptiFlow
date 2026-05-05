import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DatabaseService, Task, Subtask, Escalation } from '../../core/database/database.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

export type TaskWithRelations = Task & {
  subtasks: Subtask[];
  active_escalations: Escalation[];
};

const CAN_DELEGATE = new Set(['team_leader', 'project_manager']);

function toTaskPayload(t: Task): object {
  return { ...t } as unknown as object;
}

function buildTaskWithRelations(task: Task, db: DatabaseService): TaskWithRelations {
  const subtasks = db.subtasks.filter((s) => s.task_id === task.task_id);
  const active_escalations = db.escalations.filter(
    (e) =>
      e.task_id === task.task_id && (e.status === 'Open' || e.status === 'Reviewed'),
  );
  return { ...task, subtasks, active_escalations };
}

@Injectable()
export class TasksService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  findAll(): Task[] {
    return this.db.tasks;
  }

  findOne(id: number): TaskWithRelations {
    const task = this.db.tasks.find((t) => t.task_id === id);
    if (!task) throw new NotFoundException(`Task with ID ${id} not found`);
    return buildTaskWithRelations(task, this.db);
  }

  findByAssignee(userId: number): Task[] {
    return this.db.tasks.filter((t) => t.assigned_to === userId);
  }

  create(dto: CreateTaskDto, actorUserId: number): TaskWithRelations {
    const newTask: Task = {
      task_id: Date.now(),
      project_id: dto.project_id ?? null,
      workflow_instance_id: null,
      title: dto.title,
      description: dto.description ?? '',
      created_by: dto.created_by,
      assigned_to: dto.assigned_to,
      status: dto.status ?? 'Pending',
      priority: dto.priority ?? 'Medium',
      estimated_hours: dto.estimated_hours ?? 0,
      actual_hours: 0,
      start_date: null,
      due_date: dto.due_date ?? null,
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };
    this.db.tasks.push(newTask);
    this.auditLogs.create({
      entity_id: newTask.task_id,
      entity_type: 'Task',
      action: 'CREATED',
      performed_by: actorUserId,
      new_value: toTaskPayload(newTask),
    });
    return buildTaskWithRelations(newTask, this.db);
  }

  update(id: number, dto: UpdateTaskDto, actorUserId: number, actorRole: string): TaskWithRelations {
    const index = this.db.tasks.findIndex((t) => t.task_id === id);
    if (index === -1) throw new NotFoundException(`Task ${id} not found`);
    const before = { ...this.db.tasks[index] };
    const merged: Task = { ...before };

    const dtoKeys = Object.keys(dto) as (keyof UpdateTaskDto)[];
    let touched = false;
    for (const key of dtoKeys) {
      const v = dto[key];
      if (v !== undefined) {
        (merged as unknown as Record<string, unknown>)[key as string] = v as unknown;
        touched = true;
      }
    }
    if (!touched) {
      return buildTaskWithRelations(before, this.db);
    }

    if (
      dto.assigned_to !== undefined &&
      dto.assigned_to !== before.assigned_to &&
      !CAN_DELEGATE.has(actorRole)
    ) {
      throw new ForbiddenException('Only team leaders or project managers may reassign tasks.');
    }

    merged.updated_at = new Date().toISOString();

    const materiallyChanged = Object.keys(dto).some((k) => {
      const key = k as keyof UpdateTaskDto;
      return (
        dto[key] !== undefined &&
        (before as unknown as Record<string, unknown>)[k] !== (merged as unknown as Record<string, unknown>)[k]
      );
    });
    if (!materiallyChanged) {
      return buildTaskWithRelations(before, this.db);
    }

    this.db.tasks[index] = merged;

    const statusProvided = dto.status !== undefined;
    const statusChanged = statusProvided && dto.status !== before.status;
    const action = statusChanged ? 'STATUS_CHANGED' : 'UPDATED';
    this.auditLogs.create({
      entity_id: id,
      entity_type: 'Task',
      action,
      performed_by: actorUserId,
      old_value: toTaskPayload(before),
      new_value: toTaskPayload(merged),
    });

    return buildTaskWithRelations(merged, this.db);
  }

  remove(id: number, actorUserId: number): void {
    const index = this.db.tasks.findIndex((t) => t.task_id === id);
    if (index === -1) throw new NotFoundException(`Task ${id} not found`);
    const before = { ...this.db.tasks[index] };
    this.auditLogs.create({
      entity_id: id,
      entity_type: 'Task',
      action: 'DELETED',
      performed_by: actorUserId,
      old_value: toTaskPayload(before),
    });
    this.db.tasks.splice(index, 1);
  }
}
