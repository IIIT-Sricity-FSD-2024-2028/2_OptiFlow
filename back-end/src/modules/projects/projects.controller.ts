import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { CompanyId } from '../../core/decorators/company-id.decorator';
import { ActorUserId } from '../../core/decorators/actor-user.decorators';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';

@ApiTags('Projects')
@Controller('projects')
@UseGuards(RolesGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @Roles(
    'guest',
    'superuser',
    'company_owner',
    'Company Owner',
    'Branch Manager',
    'branch_manager',
    'hr_manager',
    'project_manager',
    'team_leader',
    'team_member',
    'compliance_officer',
  )
  @ApiOperation({ summary: 'Get all projects' })
  @ApiResponse({ status: 200, description: 'Successful operation.' })
  findAll(
    @CompanyId() companyId: string,
    @Query('branchId') branchId: string | undefined,
    @Req() req: any,
  ) {
    return this.projectsService.findAll({
      companyId,
      branchId,
      user: req.user,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a project by ID' })
  @ApiResponse({ status: 200, description: 'Successful operation.' })
  findOne(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.projectsService.findOne(id);
  }

  @Post()
  @Roles('superuser', 'project_manager', 'Branch Manager', 'branch_manager')
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({ status: 201, description: 'Successfully created.' })
  @ApiHeader({
    name: 'x-user-id',
    required: true,
    description: 'Actor User ID',
  })
  create(
    @Body() createProjectDto: CreateProjectDto,
    @ActorUserId() actorUserId: any,
    @CompanyId() companyId: string,
    @Req() req: any,
  ) {
    return this.projectsService.create(
      createProjectDto,
      String(actorUserId),
      req.user,
    );
  }

  @Patch(':id')
  @Roles('superuser', 'project_manager', 'Branch Manager', 'branch_manager')
  @ApiOperation({ summary: 'Update a project' })
  @ApiResponse({ status: 200, description: 'Successful operation.' })
  @ApiHeader({
    name: 'x-user-id',
    required: true,
    description: 'Actor User ID',
  })
  update(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @ActorUserId() actorUserId: any,
    @CompanyId() companyId: string,
    @Req() req: any,
  ) {
    return this.projectsService.update(
      id,
      updateProjectDto,
      String(actorUserId),
      req.user,
    );
  }

  @Delete(':id')
  @Roles('superuser', 'project_manager', 'Branch Manager', 'branch_manager')
  @ApiOperation({ summary: 'Delete a project' })
  @ApiResponse({ status: 200, description: 'Successful operation.' })
  @ApiHeader({
    name: 'x-user-id',
    required: true,
    description: 'Actor User ID',
  })
  remove(
    @Param('id') id: string,
    @ActorUserId() actorUserId: any,
    @CompanyId() companyId: string,
    @Req() req: any,
  ) {
    return this.projectsService.remove(id, String(actorUserId), req.user);
  }
}
