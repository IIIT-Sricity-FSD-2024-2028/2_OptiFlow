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
import { EscalationsService } from './escalations.service';
import { CreateEscalationDto } from './dto/create-escalation.dto';
import { UpdateEscalationDto } from './dto/update-escalation.dto';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { CompanyId } from '../../core/decorators/company-id.decorator';
import { ActorUserId } from '../../core/decorators/actor-user.decorators';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';

@ApiTags('Escalations')
@Controller('escalations')
@UseGuards(RolesGuard)
export class EscalationsController {
  constructor(private readonly escalationsService: EscalationsService) {}

  @Get()
  @Roles(
    'superuser',
    'project_manager',
    'team_leader',
    'team_member',
    'compliance_officer',
  )
  @ApiOperation({ summary: 'Get all escalations' })
  @ApiResponse({ status: 200, description: 'Successful operation.' })
  findAll(@CompanyId() companyId: string) {
    return this.escalationsService.findAll(companyId);
  }

  @Get(':id')
  @Roles(
    'superuser',
    'project_manager',
    'team_leader',
    'team_member',
    'compliance_officer',
  )
  @ApiOperation({ summary: 'Get an escalation by ID' })
  @ApiResponse({ status: 200, description: 'Successful operation.' })
  findOne(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.escalationsService.findOne(id, companyId);
  }

  @Post()
  @Roles('team_member', 'team_leader')
  @ApiOperation({ summary: 'Create a new escalation' })
  @ApiResponse({ status: 201, description: 'Successfully created.' })
  @ApiHeader({
    name: 'x-user-id',
    required: true,
    description: 'Actor user id',
  })
  create(
    @Body() createEscalationDto: CreateEscalationDto,
    @ActorUserId() actorUserId: any,
    @CompanyId() companyId: string,
  ) {
    return this.escalationsService.create(
      createEscalationDto,
      String(actorUserId),
      companyId,
    );
  }

  @Patch(':id')
  @Roles('team_leader', 'project_manager')
  @ApiOperation({ summary: 'Update an escalation' })
  @ApiResponse({ status: 200, description: 'Successful operation.' })
  @ApiHeader({
    name: 'x-user-id',
    required: true,
    description: 'Actor user id',
  })
  update(
    @Param('id') id: string,
    @Body() updateEscalationDto: UpdateEscalationDto,
    @ActorUserId() actorUserId: any,
    @CompanyId() companyId: string,
  ) {
    return this.escalationsService.update(
      id,
      updateEscalationDto,
      String(actorUserId),
    );
  }

  @Delete(':id')
  @Roles('team_leader', 'project_manager')
  @ApiOperation({ summary: 'Delete an escalation' })
  @ApiResponse({ status: 200, description: 'Successful operation.' })
  @ApiHeader({
    name: 'x-user-id',
    required: true,
    description: 'Actor user id',
  })
  remove(
    @Param('id') id: string,
    @ActorUserId() actorUserId: any,
    @CompanyId() companyId: string,
  ) {
    return this.escalationsService.remove(id, String(actorUserId));
  }
}
