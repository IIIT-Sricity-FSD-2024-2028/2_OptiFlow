import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService, User } from '../../core/database/database.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

export interface UserActivity {
  id: string;
  employeeId: number;
  action: string;
  timestamp: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  private activities: UserActivity[] = [];

  getActivities(employeeId: number): UserActivity[] {
    return this.activities.filter(a => a.employeeId === employeeId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  private logActivity(employeeId: number, action: string) {
    this.activities.push({
      id: Math.random().toString(36).substr(2, 9),
      employeeId,
      action,
      timestamp: new Date().toISOString()
    });
  }

  findAll(): User[] {
    return this.db.users;
  }

  findAllUserRoles() {
    return this.db.user_roles;
  }

  findOne(id: number): User {
    const user = this.db.users.find(u => u.user_id === id);
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    return user;
  }

  create(dto: CreateUserDto): User {
    if (this.db.users.some(u => u.email.toLowerCase() === dto.email.toLowerCase())) {
      throw new BadRequestException('Email already exists');
    }

    let teamId: number | null = null;
    if (dto.team) {
      const teamObj = this.db.teams.find(t => t.team_name.toLowerCase() === dto.team?.toLowerCase());
      if (teamObj) teamId = teamObj.team_id;
    }

    if (dto.manager_id && !this.db.users.find(u => u.user_id === dto.manager_id)) {
      throw new BadRequestException(`Manager with ID ${dto.manager_id} not found`);
    }

    const newUser: User = {
      user_id: this.db.users.length ? Math.max(...this.db.users.map(u => u.user_id)) + 1 : 1,
      full_name: dto.full_name,
      email: dto.email,
      phone: dto.phone ?? null,
      password_hash: dto.password_hash ?? 'default_hash',
      department_id: dto.department_id,
      team_id: teamId,
      manager_id: dto.manager_id ?? null,
      is_active: dto.is_active ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };
    this.db.users.push(newUser);

    if (dto.role) {
      const roleStr = String(dto.role);
      const roleObj = this.db.roles.find(r => r.role_name === roleStr || r.role_name === roleStr.replace(/ /g, '_').toLowerCase());
      if (roleObj) {
        this.db.user_roles.push({
          user_id: newUser.user_id,
          role_id: roleObj.role_id,
          assigned_by: null,
          assigned_at: new Date().toISOString()
        });
      }
    }

    this.logActivity(newUser.user_id, 'Employee created');

    return newUser;
  }

  update(id: number, dto: UpdateUserDto): User {
    const index = this.db.users.findIndex(u => u.user_id === id);
    if (index === -1) throw new NotFoundException(`User with ID ${id} not found`);

    if (dto.email && this.db.users.some(u => u.user_id !== id && u.email.toLowerCase() === dto.email?.toLowerCase())) {
      throw new BadRequestException('Email already exists');
    }

    let teamId = this.db.users[index].team_id;
    if (dto.team !== undefined) {
      if (dto.team === null || dto.team === '') {
        teamId = null;
      } else {
        const teamObj = this.db.teams.find(t => t.team_name.toLowerCase() === dto.team?.toLowerCase());
        if (teamObj) teamId = teamObj.team_id;
      }
    }

    if (dto.manager_id !== undefined && dto.manager_id !== null && !this.db.users.find(u => u.user_id === dto.manager_id)) {
      throw new BadRequestException(`Manager with ID ${dto.manager_id} not found`);
    }

    const updatedPhone = dto.phone !== undefined ? dto.phone : this.db.users[index].phone;

    this.db.users[index] = { ...this.db.users[index], ...dto, team_id: teamId, phone: updatedPhone };

    if (dto.role) {
      const roleStr = String(dto.role);
      const roleObj = this.db.roles.find(r => r.role_name === roleStr || r.role_name === roleStr.replace(/ /g, '_').toLowerCase());
      if (roleObj) {
        const urIndex = this.db.user_roles.findIndex(ur => ur.user_id === id);
        if (urIndex !== -1) {
          this.db.user_roles[urIndex].role_id = roleObj.role_id;
        } else {
          this.db.user_roles.push({
            user_id: id,
            role_id: roleObj.role_id,
            assigned_by: null,
            assigned_at: new Date().toISOString()
          });
        }
      }
    }

    if (dto.role) {
      this.logActivity(id, `Role updated to ${dto.role}`);
    }
    if (dto.is_active !== undefined && dto.is_active !== this.db.users[index].is_active) {
      this.logActivity(id, dto.is_active ? 'Employee activated' : 'Employee deactivated');
    }

    return this.db.users[index];
  }

  remove(id: number): void {
    const index = this.db.users.findIndex(u => u.user_id === id);
    if (index === -1) throw new NotFoundException(`User with ID ${id} not found`);
    this.logActivity(id, 'Employee deactivated');
    this.db.users.splice(index, 1);
  }
}