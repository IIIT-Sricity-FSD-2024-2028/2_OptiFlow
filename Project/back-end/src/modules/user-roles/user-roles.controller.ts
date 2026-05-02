import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserRolesService } from './user-roles.service';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../../core/guards/roles.guard';

@ApiTags('User Roles')
@Controller('user-roles')
@UseGuards(RolesGuard)
export class UserRolesController {
  constructor(private readonly userRolesService: UserRolesService) {}

  @Get()
  @ApiHeader({ name: 'x-user-role', required: true })
  findAll() {
    return this.userRolesService.findAll();
  }
}
