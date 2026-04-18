import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService, Project } from '../../core/database/database.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly db: DatabaseService) {}

  findAll(): Project[] {
    return this.db.projects;
  }

  findOne(id: number): Project {
    const project = this.db.projects.find(p => p.id === id);
    if (!project) throw new NotFoundException(`Project with ID ${id} not found`);
    return project;
  }

  create(createProjectDto: CreateProjectDto): Project {
    const newProject: Project = {
      id: this.db.projects.length ? Math.max(...this.db.projects.map(p => p.id)) + 1 : 1,
      ...createProjectDto
    };
    this.db.projects.push(newProject);
    return newProject;
  }

  update(id: number, updateProjectDto: UpdateProjectDto): Project {
    const index = this.db.projects.findIndex(p => p.id === id);
    if (index === -1) throw new NotFoundException(`Project ${id} not found`);
    this.db.projects[index] = { ...this.db.projects[index], ...updateProjectDto };
    return this.db.projects[index];
  }

  remove(id: number): void {
    const index = this.db.projects.findIndex(p => p.id === id);
    if (index === -1) throw new NotFoundException(`Project ${id} not found`);
    this.db.projects.splice(index, 1);
  }
}
