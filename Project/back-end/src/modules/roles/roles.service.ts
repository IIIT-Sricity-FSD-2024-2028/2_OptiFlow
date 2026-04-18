import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService, Role } from '../../core/database/database.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(private readonly db: DatabaseService) {}

  findAll(): Role[] { return this.db.roles; }

  findOne(id: number): Role {
    const role = this.db.roles.find(r => r.role_id === id);
    if (!role) throw new NotFoundException(`Role with ID ${id} not found`);
    return role;
  }

  create(dto: CreateRoleDto): Role {
    const newRole: Role = {
      role_id: this.db.roles.length ? Math.max(...this.db.roles.map(r => r.role_id)) + 1 : 1,
      role_name: dto.role_name,
      description: dto.description,
      is_system: dto.is_system ?? false,
      created_at: new Date().toISOString(),
    };
    this.db.roles.push(newRole);
    return newRole;
  }

  update(id: number, dto: UpdateRoleDto): Role {
    const index = this.db.roles.findIndex(r => r.role_id === id);
    if (index === -1) throw new NotFoundException(`Role ${id} not found`);
    this.db.roles[index] = { ...this.db.roles[index], ...dto };
    return this.db.roles[index];
  }

  remove(id: number): void {
    const index = this.db.roles.findIndex(r => r.role_id === id);
    if (index === -1) throw new NotFoundException(`Role ${id} not found`);
    this.db.roles.splice(index, 1);
  }
}
