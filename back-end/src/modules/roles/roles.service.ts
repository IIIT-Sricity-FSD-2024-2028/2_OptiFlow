import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService, Role, DEFAULT_ROLE_PERMISSIONS } from '../../core/database/database.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(private readonly db: DatabaseService) {}

  private getRoleKey(role_name: string): string {
    const map: Record<string, string> = {
      superuser: 'Process Admin',
      project_manager: 'Project Manager',
      compliance_officer: 'Compliance Officer',
      hr_manager: 'HR Manager',
      hr_ops: 'HR Ops',
      team_leader: 'Team Leader',
      team_member: 'Team Member'
    };
    return map[role_name.toLowerCase()] || role_name;
  }

  private mapRole(role: Role) {
    return {
      ...role,
      key: this.getRoleKey(role.role_name)
    };
  }

  findAll() {
    return this.db.roles.map(r => this.mapRole(r));
  }

  findOne(idOrSlug: string) {
    let role;
    if (isNaN(Number(idOrSlug))) {
      role = this.db.roles.find(r => r.role_name.toLowerCase() === idOrSlug.toLowerCase() || this.getRoleKey(r.role_name).toLowerCase().replace(/ /g, '_') === idOrSlug.toLowerCase());
    } else {
      role = this.db.roles.find(r => r.role_id === Number(idOrSlug));
    }
    if (!role) throw new NotFoundException(`Role ${idOrSlug} not found`);
    return this.mapRole(role);
  }

  create(dto: CreateRoleDto) {
    const newRole: Role = {
      role_id: this.db.roles.length ? Math.max(...this.db.roles.map(r => r.role_id)) + 1 : 1,
      role_name: dto.role_name,
      description: dto.description,
      is_system: dto.is_system ?? false,
      created_at: new Date().toISOString(),
      permissions: dto.permissions
    };
    this.db.roles.push(newRole);
    return this.mapRole(newRole);
  }

  update(idOrSlug: string, dto: UpdateRoleDto) {
    let index;
    if (isNaN(Number(idOrSlug))) {
      index = this.db.roles.findIndex(r => r.role_name.toLowerCase() === idOrSlug.toLowerCase() || this.getRoleKey(r.role_name).toLowerCase().replace(/ /g, '_') === idOrSlug.toLowerCase());
    } else {
      index = this.db.roles.findIndex(r => r.role_id === Number(idOrSlug));
    }
    if (index === -1) throw new NotFoundException(`Role ${idOrSlug} not found`);
    this.db.roles[index] = { ...this.db.roles[index], ...dto };
    return this.mapRole(this.db.roles[index]);
  }

  remove(idOrSlug: string): void {
    let index;
    if (isNaN(Number(idOrSlug))) {
      index = this.db.roles.findIndex(r => r.role_name.toLowerCase() === idOrSlug.toLowerCase() || this.getRoleKey(r.role_name).toLowerCase().replace(/ /g, '_') === idOrSlug.toLowerCase());
    } else {
      index = this.db.roles.findIndex(r => r.role_id === Number(idOrSlug));
    }
    if (index === -1) throw new NotFoundException(`Role ${idOrSlug} not found`);
    this.db.roles.splice(index, 1);
  }

  getOverrides(userId: number) {
    return this.db.user_overrides[userId] || null;
  }

  setOverrides(userId: number, permissions: Record<string, boolean>) {
    this.db.user_overrides[userId] = permissions;
    return this.db.user_overrides[userId];
  }

  deleteOverrides(userId: number) {
    delete this.db.user_overrides[userId];
    return { success: true };
  }

  resetRoles() {
    this.db.roles.forEach(role => {
      const key = this.getRoleKey(role.role_name);
      if (DEFAULT_ROLE_PERMISSIONS[key]) {
        role.permissions = { ...DEFAULT_ROLE_PERMISSIONS[key] };
      }
    });
    return { success: true };
  }
}
