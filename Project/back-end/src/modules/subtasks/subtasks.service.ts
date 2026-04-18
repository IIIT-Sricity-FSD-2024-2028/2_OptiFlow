import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService, Subtask } from '../../core/database/database.service';
import { CreateSubtaskDto } from './dto/create-subtask.dto';
import { UpdateSubtaskDto } from './dto/update-subtask.dto';

@Injectable()
export class SubtasksService {
  constructor(private readonly db: DatabaseService) {}

  findAll(): Subtask[] { return this.db.subtasks; }

  findByTask(taskId: number): Subtask[] { return this.db.subtasks.filter(s => s.task_id === taskId); }

  findOne(id: number): Subtask {
    const subtask = this.db.subtasks.find(s => s.subtask_id === id);
    if (!subtask) throw new NotFoundException(`Subtask with ID ${id} not found`);
    return subtask;
  }

  create(dto: CreateSubtaskDto): Subtask {
    const newSubtask: Subtask = {
      subtask_id: this.db.subtasks.length ? Math.max(...this.db.subtasks.map(s => s.subtask_id)) + 1 : 1,
      task_id: dto.task_id,
      title: dto.title,
      description: dto.description ?? '',
      assigned_to: dto.assigned_to,
      status: dto.status ?? 'Pending',
      estimated_hours: dto.estimated_hours ?? 0,
      due_date: dto.due_date ?? null,
      completed_at: null,
      created_at: new Date().toISOString(),
    };
    this.db.subtasks.push(newSubtask);
    return newSubtask;
  }

  update(id: number, dto: UpdateSubtaskDto): Subtask {
    const index = this.db.subtasks.findIndex(s => s.subtask_id === id);
    if (index === -1) throw new NotFoundException(`Subtask ${id} not found`);
    this.db.subtasks[index] = { ...this.db.subtasks[index], ...dto };
    return this.db.subtasks[index];
  }

  remove(id: number): void {
    const index = this.db.subtasks.findIndex(s => s.subtask_id === id);
    if (index === -1) throw new NotFoundException(`Subtask ${id} not found`);
    this.db.subtasks.splice(index, 1);
  }
}
