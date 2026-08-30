import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { CompanyId } from '../../core/decorators/company-id.decorator';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Roles(
    'superuser',
    'hr_manager',
    'project_manager',
    'team_leader',
    'team_member',
    'compliance_officer',
  )
  @ApiOperation({ summary: 'Get all notifications (or filter by userId)' })
  findAll(
    @Query('userId') userId: string | undefined,
    @CompanyId() companyId: string,
  ) {
    if (userId) {
      return this.notificationsService.findByUser(userId);
    }
    return this.notificationsService.findAll(companyId);
  }

  @Post()
  @Roles('superuser', 'project_manager', 'team_leader', 'compliance_officer')
  @ApiOperation({ summary: 'Create a new notification' })
  create(@Body() data: any, @CompanyId() companyId: string) {
    return this.notificationsService.create({
      userId: String(data.userId || data.user_id),
      title: data.title,
      message: data.message,
      type: data.type || 'System',
      link: data.link,
    });
  }

  @Patch(':id/read')
  @Roles(
    'superuser',
    'hr_manager',
    'project_manager',
    'team_leader',
    'team_member',
    'compliance_officer',
  )
  @ApiOperation({ summary: 'Mark a notification as read' })
  markAsRead(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Post('read-all')
  @Roles(
    'superuser',
    'hr_manager',
    'project_manager',
    'team_leader',
    'team_member',
    'compliance_officer',
  )
  @ApiOperation({ summary: 'Mark all notifications as read for a user' })
  markAllAsRead(
    @Body('userId') userId: string,
    @CompanyId() companyId: string,
  ) {
    return this.notificationsService.markAllAsRead(String(userId));
  }
}
