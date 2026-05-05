import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserRolesService } from './user-roles.service';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';

@ApiTags('User Roles')
@Controller('user-roles')
@UseGuards(RolesGuard)
export class UserRolesController {
  constructor(private readonly userRolesService: UserRolesService) {}

  @Get()
  @Roles('guest', 'superuser', 'project_manager', 'hr_manager', 'compliance_officer', 'team_leader', 'team_member', 'hr_ops')
  findAll() {
    return this.userRolesService.findAll();
  }
}
