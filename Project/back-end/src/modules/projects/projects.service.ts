import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService, Project } from '../../core/database/database.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly db: DatabaseService) {}

  findAll(): Project[] { return this.db.projects; }

  findOne(id: number): Project {
    const project = this.db.projects.find(p => p.project_id === id);
    if (!project) throw new NotFoundException(`Project with ID ${id} not found`);
    return project;
  }

  create(dto: CreateProjectDto): Project {
    const newProject: Project = {
      project_id: this.db.projects.length ? Math.max(...this.db.projects.map(p => p.project_id)) + 1 : 1,
      project_name: dto.project_name,
      description: dto.description ?? '',
      department_id: dto.department_id,
      status: dto.status ?? 'Planning',
      start_date: dto.start_date,
      end_date: dto.end_date ?? null,
      created_by: dto.created_by,
      created_at: new Date().toISOString(),
    };
    this.db.projects.push(newProject);
    return newProject;
  }

  update(id: number, dto: UpdateProjectDto): Project {
    const index = this.db.projects.findIndex(p => p.project_id === id);
    if (index === -1) throw new NotFoundException(`Project ${id} not found`);
    this.db.projects[index] = { ...this.db.projects[index], ...dto };
    return this.db.projects[index];
  }

  remove(id: number): void {
    const index = this.db.projects.findIndex(p => p.project_id === id);
    if (index === -1) throw new NotFoundException(`Project ${id} not found`);
    this.db.projects.splice(index, 1);
  }
}
