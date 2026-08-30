import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { CompanyId } from '../../core/decorators/company-id.decorator';
import { ActorUserId } from '../../core/decorators/actor-user.decorators';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Comments')
@Controller('comments')
@UseGuards(RolesGuard)
export class CommentsController {
  constructor(private readonly svc: CommentsService) {}
  @Get()
  @Roles(
    'superuser',
    'hr_manager',
    'project_manager',
    'team_leader',
    'team_member',
    'compliance_officer',
  )
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'entityId', required: false })
  @ApiOperation({ summary: 'List comments' })
  findAll(
    @CompanyId() companyId: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
  ) {
    return this.svc.findAll(companyId, entityType, entityId);
  }
  @Get(':id')
  @Roles(
    'superuser',
    'hr_manager',
    'project_manager',
    'team_leader',
    'team_member',
    'compliance_officer',
  )
  @ApiOperation({ summary: 'Get a comment' })
  findOne(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.svc.findOne(id);
  }
  @Post()
  @Roles(
    'superuser',
    'hr_manager',
    'project_manager',
    'team_leader',
    'team_member',
    'compliance_officer',
  )
  @ApiOperation({ summary: 'Create a comment' })
  create(
    @Body() dto: CreateCommentDto,
    @CompanyId() companyId: string,
    @ActorUserId() userId: string,
  ) {
    return this.svc.create(dto, companyId, userId);
  }
  @Patch(':id')
  @Roles(
    'superuser',
    'hr_manager',
    'project_manager',
    'team_leader',
    'team_member',
    'compliance_officer',
  )
  @ApiOperation({ summary: 'Update a comment (author only)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCommentDto,
    @CompanyId() companyId: string,
  ) {
    return this.svc.update(id, dto);
  }
  @Delete(':id')
  @Roles(
    'superuser',
    'hr_manager',
    'project_manager',
    'team_leader',
    'team_member',
    'compliance_officer',
  )
  @ApiOperation({ summary: 'Delete a comment' })
  remove(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.svc.remove(id);
  }
}
