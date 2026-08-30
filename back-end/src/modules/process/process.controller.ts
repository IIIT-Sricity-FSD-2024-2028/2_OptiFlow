import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ProcessTemplatesService } from '../process-templates/process-templates.service';
import { CreateProcessTemplateDto } from '../process-templates/dto/create-process-template.dto';
import { UpdateProcessTemplateDto } from '../process-templates/dto/update-process-template.dto';
import { PrismaService } from '../../core/prisma/prisma.service';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/guards/roles.decorator';
import { CompanyId } from '../../core/decorators/company-id.decorator';
import { ActorUserId } from '../../core/decorators/actor-user.decorators';

@ApiTags('Process Management')
@Controller('processes')
@UseGuards(RolesGuard)
@Roles('Process Admin', 'Company Owner')
export class ProcessController {
  constructor(
    private readonly processTemplatesSvc: ProcessTemplatesService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('templates')
  @ApiOperation({ summary: 'List all process templates for the company' })
  findAll(@CompanyId() companyId: string) {
    return this.processTemplatesSvc.findAll(companyId);
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Get a single process template with its steps' })
  findOne(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.processTemplatesSvc.findOne(id, companyId);
  }

  @Roles('Process Admin')
  @Post('templates')
  @ApiOperation({ summary: 'Create a new process template' })
  create(
    @Body() dto: CreateProcessTemplateDto,
    @CompanyId() companyId: string,
    @ActorUserId() actorId: string,
  ) {
    return this.processTemplatesSvc.create(dto, companyId);
  }

  @Roles('Process Admin')
  @Patch('templates/:id')
  @ApiOperation({ summary: 'Update a process template' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProcessTemplateDto,
    @CompanyId() companyId: string,
  ) {
    return this.processTemplatesSvc.update(id, dto, companyId);
  }

  @Delete('templates/:id')
  @Roles('Company Owner')
  @ApiOperation({ summary: 'Delete a process template (Company Owner only)' })
  remove(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.processTemplatesSvc.remove(id, companyId);
  }

  @Get('templates/:id/steps')
  @ApiOperation({ summary: 'List all steps for a process template' })
  async getSteps(
    @Param('id') templateId: string,
    @CompanyId() companyId: string,
  ) {
    return this.prisma.processTemplateStep.findMany({
      where: { templateId, template: { companyId } },
      include: {
        requiredPermission: { select: { id: true, slug: true } },
      },
      orderBy: { stepOrder: 'asc' },
    });
  }

  @Roles('Process Admin')
  @Post('templates/:id/steps')
  @ApiOperation({ summary: 'Add a step to a process template' })
  async addStep(
    @Param('id') templateId: string,
    @Body()
    body: {
      name: string;
      stepOrder: number;
      stepType: string;
      requiredPermissionId?: string;
      escalationTimeoutHours?: number;
    },
    @CompanyId() companyId: string,
  ) {
    const template = await this.prisma.processTemplate.findFirst({
      where: { id: templateId, companyId },
    });
    if (!template) {
      throw new Error(`Template ${templateId} not found for this company`);
    }

    return this.prisma.processTemplateStep.create({
      data: {
        templateId,
        name: body.name,
        stepOrder: body.stepOrder,
        stepType: body.stepType as any,
        requiredPermissionId: body.requiredPermissionId ?? null,
        escalationTimeoutHours: body.escalationTimeoutHours ?? null,
      },
    });
  }
}
