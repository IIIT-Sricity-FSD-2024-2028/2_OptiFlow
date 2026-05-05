import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService, Department } from '../../core/database/database.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(private readonly db: DatabaseService) {}

  findAll(): Department[] { return this.db.departments; }

  findOne(id: number): Department {
    const dept = this.db.departments.find(d => d.department_id === id);
    if (!dept) throw new NotFoundException(`Department with ID ${id} not found`);
    return dept;
  }

  create(dto: CreateDepartmentDto): Department {
    const newDept: Department = {
      department_id: this.db.departments.length ? Math.max(...this.db.departments.map(d => d.department_id)) + 1 : 1,
      department_name: dto.department_name,
      manager_id: dto.manager_id ?? null,
      created_at: new Date().toISOString(),
    };
    this.db.departments.push(newDept);
    return newDept;
  }

  update(id: number, dto: UpdateDepartmentDto): Department {
    const index = this.db.departments.findIndex(d => d.department_id === id);
    if (index === -1) throw new NotFoundException(`Department ${id} not found`);
    this.db.departments[index] = { ...this.db.departments[index], ...dto };
    return this.db.departments[index];
  }

  remove(id: number): void {
    const index = this.db.departments.findIndex(d => d.department_id === id);
    if (index === -1) throw new NotFoundException(`Department ${id} not found`);
    this.db.departments.splice(index, 1);
  }
}
