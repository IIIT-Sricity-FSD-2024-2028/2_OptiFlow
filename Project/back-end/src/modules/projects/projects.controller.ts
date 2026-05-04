import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { ActorUserId } from '../../core/decorators/actor-user.decorators';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';

@ApiTags('Projects')
@Controller('projects')
@UseGuards(RolesGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all projects' })
  @ApiResponse({ status: 200, description: 'Successful operation.' })
  @ApiHeader({ name: 'x-user-role', required: true, description: 'Role-Based Access Control' })
  findAll() {
    return this.projectsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a project by ID' })
  @ApiResponse({ status: 200, description: 'Successful operation.' })
  @ApiHeader({ name: 'x-user-role', required: true, description: 'Role-Based Access Control' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.projectsService.findOne(id);
  }

  @Post()
  @Roles('superuser', 'project_manager')
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({ status: 201, description: 'Successfully created.' })
  @ApiHeader({ name: 'x-user-role', required: true, description: 'Role-Based Access Control' })
  @ApiHeader({ name: 'x-user-id', required: true, description: 'Actor User ID' })
  create(@Body() createProjectDto: CreateProjectDto, @ActorUserId() actorUserId: number) {
    return this.projectsService.create(createProjectDto, actorUserId);
  }

  @Patch(':id')
  @Roles('superuser', 'project_manager')
  @ApiOperation({ summary: 'Update a project' })
  @ApiResponse({ status: 200, description: 'Successful operation.' })
  @ApiHeader({ name: 'x-user-role', required: true, description: 'Role-Based Access Control' })
  @ApiHeader({ name: 'x-user-id', required: true, description: 'Actor User ID' })
  update(
    @Param('id', ParseIntPipe) id: number, 
    @Body() updateProjectDto: UpdateProjectDto,
    @ActorUserId() actorUserId: number
  ) {
    return this.projectsService.update(id, updateProjectDto, actorUserId);
  }

  @Delete(':id')
  @Roles('superuser', 'project_manager')
  @ApiOperation({ summary: 'Delete a project' })
  @ApiResponse({ status: 200, description: 'Successful operation.' })
  @ApiHeader({ name: 'x-user-role', required: true, description: 'Role-Based Access Control' })
  @ApiHeader({ name: 'x-user-id', required: true, description: 'Actor User ID' })
  remove(@Param('id', ParseIntPipe) id: number, @ActorUserId() actorUserId: number) {
    return this.projectsService.remove(id, actorUserId);
  }
}
