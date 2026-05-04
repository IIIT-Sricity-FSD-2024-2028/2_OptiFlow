import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService, Project } from '../../core/database/database.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  findAll(): Project[] { return this.db.projects; }

  findOne(id: number): Project {
    const project = this.db.projects.find(p => p.project_id === id);
    if (!project) throw new NotFoundException(`Project with ID ${id} not found`);
    return project;
  }

  create(dto: CreateProjectDto, actorUserId: number): Project {
    const newProject: Project = {
      // Use timestamp-based ID to prevent reuse after deletion
      project_id: Date.now(),
      project_name: dto.project_name,
      description: dto.description ?? '',
      department_id: dto.department_id,
      status: dto.status ?? 'Planning',
      start_date: dto.start_date,
      end_date: dto.end_date ?? null,
      created_by: dto.created_by,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.db.projects.push(newProject);
    this.auditLogs.create({
      entity_id: newProject.project_id,
      entity_type: 'Project',
      action: 'CREATED',
      performed_by: actorUserId,
      new_value: { ...newProject },
    });
    return newProject;
  }

  update(id: number, dto: UpdateProjectDto, actorUserId: number): Project {
    const index = this.db.projects.findIndex(p => p.project_id === id);
    if (index === -1) throw new NotFoundException(`Project ${id} not found`);
    const before = { ...this.db.projects[index] };
    this.db.projects[index] = { ...this.db.projects[index], ...dto, updated_at: new Date().toISOString() };
    const after = this.db.projects[index];

    this.auditLogs.create({
      entity_id: id,
      entity_type: 'Project',
      action: 'UPDATED',
      performed_by: actorUserId,
      old_value: before,
      new_value: after,
    });

    return after;
  }

  remove(id: number, actorUserId: number): void {
    const index = this.db.projects.findIndex(p => p.project_id === id);
    if (index === -1) throw new NotFoundException(`Project ${id} not found`);
    const before = { ...this.db.projects[index] };
    
    // Audit Log the deletion
    this.auditLogs.create({
      entity_id: id,
      entity_type: 'Project',
      action: 'DELETED',
      performed_by: actorUserId,
      old_value: before,
    });

    // Cascade Delete: Remove all tasks associated with this project
    this.db.tasks = this.db.tasks.filter(t => t.project_id !== id);
    
    // Remove the project
    this.db.projects.splice(index, 1);
  }
}
