import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, ParseIntPipe } from '@nestjs/common';
import { EvidenceService } from './evidence.service';
import { CreateEvidenceDto } from './dto/create-evidence.dto';
import { UpdateEvidenceDto } from './dto/update-evidence.dto';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';

@ApiTags('Evidence')
@Controller('evidence')
@UseGuards(RolesGuard)
export class EvidenceController {
  constructor(private readonly evidenceService: EvidenceService) {}

  @Get()
  @ApiOperation({ summary: 'Get all evidence' })
  @ApiResponse({ status: 200, description: 'Successful operation.' })
  @ApiHeader({ name: 'x-user-role', required: true, description: 'Role-Based Access Control' })
  findAll() {
    return this.evidenceService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get evidence by ID' })
  @ApiResponse({ status: 200, description: 'Successful operation.' })
  @ApiHeader({ name: 'x-user-role', required: true, description: 'Role-Based Access Control' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.evidenceService.findOne(id);
  }

  @Post()
  @Roles('superuser', 'project_manager', 'team_leader', 'team_member')
  @ApiOperation({ summary: 'Submit new evidence' })
  @ApiResponse({ status: 201, description: 'Successfully created.' })
  @ApiHeader({ name: 'x-user-role', required: true, description: 'Role-Based Access Control' })
  create(@Body() createEvidenceDto: CreateEvidenceDto) {
    return this.evidenceService.create(createEvidenceDto);
  }

  @Patch(':id')
  @Roles('superuser', 'compliance_officer', 'project_manager', 'team_leader', 'team_member')
  @ApiOperation({ summary: 'Update evidence status/content' })
  @ApiResponse({ status: 200, description: 'Successful operation.' })
  @ApiHeader({ name: 'x-user-role', required: true, description: 'Role-Based Access Control' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateEvidenceDto: UpdateEvidenceDto) {
    return this.evidenceService.update(id, updateEvidenceDto);
  }

  @Delete(':id')
  @Roles('superuser', 'compliance_officer', 'team_leader', 'team_member')
  @ApiOperation({ summary: 'Delete evidence' })
  @ApiResponse({ status: 200, description: 'Successful operation.' })
  @ApiHeader({ name: 'x-user-role', required: true, description: 'Role-Based Access Control' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.evidenceService.remove(id);
  }
}
