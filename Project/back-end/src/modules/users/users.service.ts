import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService, User } from '../../core/database/database.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  findAll(): User[] {
    return this.db.users;
  }

  findOne(id: number): User {
    const user = this.db.users.find(u => u.user_id === id);
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    return user;
  }

  create(dto: CreateUserDto): User {
    const newUser: User = {
      user_id: this.db.users.length ? Math.max(...this.db.users.map(u => u.user_id)) + 1 : 1,
      full_name: dto.full_name,
      email: dto.email,
      password_hash: dto.password_hash ?? 'default_hash',
      role: dto.role,
      department_id: dto.department_id,
      manager_id: dto.manager_id ?? null,
      is_active: dto.is_active ?? true,
      created_at: new Date().toISOString(),
    };
    this.db.users.push(newUser);
    return newUser;
  }

  update(id: number, dto: UpdateUserDto): User {
    const index = this.db.users.findIndex(u => u.user_id === id);
    if (index === -1) throw new NotFoundException(`User with ID ${id} not found`);
    this.db.users[index] = { ...this.db.users[index], ...dto };
    return this.db.users[index];
  }

  remove(id: number): void {
    const index = this.db.users.findIndex(u => u.user_id === id);
    if (index === -1) throw new NotFoundException(`User with ID ${id} not found`);
    this.db.users.splice(index, 1);
  }
}