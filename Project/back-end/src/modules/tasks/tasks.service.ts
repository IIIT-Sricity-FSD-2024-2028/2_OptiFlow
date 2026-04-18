import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService, Task } from '../../core/database/database.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(private readonly db: DatabaseService) {}

  findAll(): Task[] {
    return this.db.tasks;
  }

  findOne(id: number): Task {
    const task = this.db.tasks.find(t => t.id === id);
    if (!task) throw new NotFoundException(`Task with ID ${id} not found`);
    return task;
  }

  findByAssignee(userId: number): Task[] {
    return this.db.tasks.filter(t => t.assigned_to === userId);
  }

  create(createTaskDto: CreateTaskDto): Task {
    const newTask: Task = {
      id: this.db.tasks.length ? Math.max(...this.db.tasks.map(t => t.id)) + 1 : 1,
      ...createTaskDto
    };
    this.db.tasks.push(newTask);
    return newTask;
  }

  update(id: number, updateTaskDto: UpdateTaskDto): Task {
    const index = this.db.tasks.findIndex(t => t.id === id);
    if (index === -1) throw new NotFoundException(`Task ${id} not found`);
    this.db.tasks[index] = { ...this.db.tasks[index], ...updateTaskDto };
    return this.db.tasks[index];
  }

  remove(id: number): void {
    const index = this.db.tasks.findIndex(t => t.id === id);
    if (index === -1) throw new NotFoundException(`Task ${id} not found`);
    this.db.tasks.splice(index, 1);
  }
}