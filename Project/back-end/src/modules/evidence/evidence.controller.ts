import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, ParseIntPipe } from '@nestjs/common';
import { EvidenceService } from './evidence.service';
import { CreateEvidenceDto } from './dto/create-evidence.dto';
import { UpdateEvidenceDto } from './dto/update-evidence.dto';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Evidence')
@Controller('evidence')
@UseGuards(RolesGuard)
export class EvidenceController {
  constructor(private readonly evidenceService: EvidenceService) {}

  @Get()
  @ApiOperation({ summary: 'Get all evidence' })
  findAll() {
    return this.evidenceService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get evidence by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.evidenceService.findOne(id);
  }

  @Post()
  @Roles('superuser', 'project_manager', 'team_leader', 'team_member')
  @ApiOperation({ summary: 'Submit new evidence' })
  create(@Body() createEvidenceDto: CreateEvidenceDto) {
    return this.evidenceService.create(createEvidenceDto);
  }

  @Patch(':id')
  @Roles('superuser', 'compliance_officer', 'project_manager')
  @ApiOperation({ summary: 'Update evidence status/content' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateEvidenceDto: UpdateEvidenceDto) {
    return this.evidenceService.update(id, updateEvidenceDto);
  }

  @Delete(':id')
  @Roles('superuser', 'compliance_officer')
  @ApiOperation({ summary: 'Delete evidence' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.evidenceService.remove(id);
  }
}
