import { Controller, Get, Post, Body, Param, Patch, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all notifications (or filter by userId)' })
  findAll(@Query('userId') userId?: string) {
    if (userId) {
      return this.notificationsService.findByUser(parseInt(userId));
    }
    return this.notificationsService.findAll();
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(parseInt(id));
  }

  @Post()
  @ApiOperation({ summary: 'Create a new notification' })
  create(@Body() data: any) {
    return this.notificationsService.create(data);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read for a user' })
  markAllAsRead(@Body('userId') userId: number) {
    return this.notificationsService.markAllAsRead(userId);
  }
}
