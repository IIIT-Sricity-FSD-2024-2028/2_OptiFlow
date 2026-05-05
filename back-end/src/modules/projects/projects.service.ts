import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService, Project, Task, TaskStatus, TaskPriority } from '../../core/database/database.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditLogs: AuditLogsService,
    private readonly notifications: NotificationsService,
  ) {}

  findAll(): Project[] { return this.db.projects; }

  findOne(id: number): Project {
    const project = this.db.projects.find(p => p.project_id === id);
    if (!project) throw new NotFoundException(`Project with ID ${id} not found`);
    return project;
  }

  create(dto: CreateProjectDto, actorUserId: number): Project {
    const newProject: Project = {
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

    // ── Template Automation ──────────────────────────────────────────────────
    if (dto.template_id) {
      // Find the Team Leader (Role 5) for this department
      const teamLeaderId = this.db.user_roles.find(ur => {
        const user = this.db.users.find(u => u.user_id === ur.user_id);
        return user && 
               Number(user.department_id) === Number(dto.department_id) && 
               Number(ur.role_id) === 5; // Role 5 is Team Leader
      })?.user_id;

      const targetAssignee = teamLeaderId || actorUserId; // Fallback to PM if no TL found

      const templateSteps = this.db.workflow_template_steps
        .filter(s => s.template_id === dto.template_id)
        .sort((a, b) => a.step_order - b.step_order);

      templateSteps.forEach((step, index) => {
        const newTask: Task = {
          task_id: Date.now() + index + 1000, 
          project_id: newProject.project_id,
          workflow_instance_id: null,
          title: step.step_name,
          description: `Stage ${step.step_order} automatically generated from template: ${dto.project_name}`,
          created_by: actorUserId,
          assigned_to: targetAssignee,
          status: (index === 0 ? 'In_Progress' : 'Pending') as TaskStatus,
          priority: 'Medium' as TaskPriority,
          estimated_hours: step.escalation_timeout_hours || 8,
          actual_hours: 0,
          start_date: index === 0 ? newProject.start_date : null,
          due_date: newProject.end_date,
          completed_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null
        };
        this.db.tasks.push(newTask);

        // ── Trigger Notification ─────────────────────────────────────────────
        this.notifications.create({
          user_id: newTask.assigned_to || actorUserId,
          title: 'New Task Assigned',
          message: `You have been assigned to "${newTask.title}" in project "${newProject.project_name}".`,
          type: 'Task',
          link: `tasks.html?id=${newTask.task_id}`
        });
      });
    }

    this.db.projects.push(newProject);
    this.auditLogs.create({
      entity_id: newProject.project_id,
      entity_type: 'Project',
      action: 'CREATED',
      performed_by: actorUserId,
      new_value: { ...newProject, generated_tasks: dto.template_id ? true : false },
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
