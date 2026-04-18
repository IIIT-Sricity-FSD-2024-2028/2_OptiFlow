import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService, Task } from '../../core/database/database.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(private readonly db: DatabaseService) {}

  findAll(): Task[] { return this.db.tasks; }

  findOne(id: number): Task {
    const task = this.db.tasks.find(t => t.task_id === id);
    if (!task) throw new NotFoundException(`Task with ID ${id} not found`);
    return task;
  }

  findByAssignee(userId: number): Task[] {
    return this.db.tasks.filter(t => t.assigned_to === userId);
  }

  create(dto: CreateTaskDto): Task {
    const newTask: Task = {
      task_id: this.db.tasks.length ? Math.max(...this.db.tasks.map(t => t.task_id)) + 1 : 1,
      project_id: dto.project_id ?? null,
      title: dto.title,
      description: dto.description ?? '',
      created_by: dto.created_by,
      assigned_to: dto.assigned_to,
      status: dto.status ?? 'Pending',
      priority: dto.priority ?? 'Medium',
      estimated_hours: dto.estimated_hours ?? 0,
      actual_hours: 0,
      due_date: dto.due_date ?? null,
      completed_at: null,
      created_at: new Date().toISOString(),
    };
    this.db.tasks.push(newTask);
    return newTask;
  }

  update(id: number, dto: UpdateTaskDto): Task {
    const index = this.db.tasks.findIndex(t => t.task_id === id);
    if (index === -1) throw new NotFoundException(`Task ${id} not found`);
    this.db.tasks[index] = { ...this.db.tasks[index], ...dto };
    return this.db.tasks[index];
  }

  remove(id: number): void {
    const index = this.db.tasks.findIndex(t => t.task_id === id);
    if (index === -1) throw new NotFoundException(`Task ${id} not found`);
    this.db.tasks.splice(index, 1);
  }
}