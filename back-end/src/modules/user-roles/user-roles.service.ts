import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';

@Injectable()
export class UserRolesService {
  constructor(private readonly databaseService: DatabaseService) {}

  findAll() {
    return this.databaseService.user_roles;
  }
}
