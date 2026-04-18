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
    const user = this.db.users.find(u => u.id === id);
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    return user;
  }

  create(createUserDto: CreateUserDto): User {
    const newUser: User = {
      id: this.db.users.length ? Math.max(...this.db.users.map(u => u.id)) + 1 : 1,
      full_name: createUserDto.full_name,
      email: createUserDto.email,
      role: createUserDto.role,
      department_id: createUserDto.department_id,
      reports_to: createUserDto.reports_to || null,
      status: createUserDto.status
    };
    this.db.users.push(newUser);
    return newUser;
  }

  update(id: number, updateUserDto: UpdateUserDto): User {
    const userIndex = this.db.users.findIndex(u => u.id === id);
    if (userIndex === -1) throw new NotFoundException(`User with ID ${id} not found`);
    
    const updatedUser = { 
      ...this.db.users[userIndex], 
      ...updateUserDto, 
      reports_to: updateUserDto.reports_to !== undefined ? updateUserDto.reports_to : this.db.users[userIndex].reports_to 
    };
    this.db.users[userIndex] = updatedUser;
    return updatedUser;
  }

  remove(id: number): void {
    const userIndex = this.db.users.findIndex(u => u.id === id);
    if (userIndex === -1) throw new NotFoundException(`User with ID ${id} not found`);
    this.db.users.splice(userIndex, 1);
  }
}