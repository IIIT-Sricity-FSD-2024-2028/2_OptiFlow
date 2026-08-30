import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { RoleAssignmentsService } from './role-assignments.service';
import { CreateRoleAssignmentDto } from './dto/create-role-assignment.dto';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { CompanyId } from '../../core/decorators/company-id.decorator';
import { ActorUserId } from '../../core/decorators/actor-user.decorators';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Role Assignments')
@Controller('role-assignments')
@UseGuards(RolesGuard)
export class RoleAssignmentsController {
  constructor(private readonly svc: RoleAssignmentsService) {}
  @Get()
  @Roles('superuser', 'hr_manager')
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'roleId', required: false })
  @ApiOperation({ summary: 'List role assignments' })
  findAll(
    @CompanyId() companyId: string,
    @Query('userId') userId?: string,
    @Query('roleId') roleId?: string,
  ) {
    return this.svc.findAll(companyId, userId, roleId);
  }
  @Get(':id')
  @Roles('superuser', 'hr_manager')
  @ApiOperation({ summary: 'Get a role assignment' })
  findOne(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.svc.findOne(id);
  }
  @Post()
  @Roles('superuser', 'hr_manager')
  @ApiOperation({ summary: 'Create a role assignment' })
  create(
    @Body() dto: CreateRoleAssignmentDto,
    @CompanyId() companyId: string,
    @ActorUserId() actorId: string,
  ) {
    return this.svc.create(dto, companyId, actorId);
  }
  @Delete(':id')
  @Roles('superuser', 'hr_manager')
  @ApiOperation({ summary: 'Revoke a role assignment' })
  remove(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.svc.remove(id);
  }
}
