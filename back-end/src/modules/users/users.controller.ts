import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { CompanyId } from '../../core/decorators/company-id.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';

@ApiTags('Users')
@Controller('users')
@UseGuards(RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(
    'guest',
    'superuser',
    'hr_manager',
    'project_manager',
    'team_leader',
    'team_member',
    'compliance_officer',
  )
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'Successful operation.' })
  findAll(@CompanyId() companyId: string) {
    return this.usersService.findAll(companyId);
  }

  @Get('roles/mapping')
  @Roles(
    'guest',
    'superuser',
    'hr_manager',
    'project_manager',
    'team_leader',
    'team_member',
    'compliance_officer',
  )
  @ApiOperation({ summary: 'Get user roles mapping' })
  @ApiResponse({ status: 200, description: 'Successful operation.' })
  findAllUserRoles(@CompanyId() companyId: string) {
    return this.usersService.findAllUserRoles(companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiResponse({ status: 200, description: 'Successful operation.' })
  findOne(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.usersService.findOne(id);
  }

  @Get(':id/activities')
  @ApiOperation({ summary: 'Get activities for a user' })
  @ApiResponse({ status: 200, description: 'Successful operation.' })
  @ApiHeader({
    name: 'x-user-role',
    required: true,
    description: 'Role-Based Access Control',
  })
  getActivities(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.usersService.getActivities(id);
  }

  @Post()
  @Roles('superuser', 'hr_manager')
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'Successfully created.' })
  create(@Body() createUserDto: CreateUserDto, @CompanyId() companyId: string) {
    return this.usersService.create(createUserDto);
  }

  @Patch(':id')
  @Roles('superuser', 'hr_manager')
  @ApiOperation({ summary: 'Update a user' })
  @ApiResponse({ status: 200, description: 'Successful operation.' })
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CompanyId() companyId: string,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles('superuser', 'hr_manager')
  @ApiOperation({ summary: 'Delete a user' })
  @ApiResponse({ status: 200, description: 'Successful operation.' })
  remove(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.usersService.remove(id);
  }
}
