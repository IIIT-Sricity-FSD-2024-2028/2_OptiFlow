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
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { PlatformAdminGuard } from '../../core/guards/platform-admin.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Subscriptions')
@Controller('subscriptions')
@UseGuards(PlatformAdminGuard)
@Roles('platform_admin')
export class SubscriptionsController {
  constructor(private readonly svc: SubscriptionsService) {}
  @Get()
  @ApiQuery({ name: 'companyId', required: false })
  @ApiOperation({ summary: 'List subscriptions' })
  findAll(@Query('companyId') companyId?: string) {
    return this.svc.findAll(companyId);
  }
  @Get(':id') @ApiOperation({ summary: 'Get a subscription' }) findOne(
    @Param('id') id: string,
  ) {
    return this.svc.findOne(id);
  }
  @Post() @ApiOperation({ summary: 'Create a subscription' }) create(
    @Body() dto: CreateSubscriptionDto,
  ) {
    return this.svc.create(dto);
  }
  @Patch(':id') @ApiOperation({ summary: 'Update a subscription' }) update(
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionDto,
  ) {
    return this.svc.update(id, dto);
  }
  @Delete(':id') @ApiOperation({ summary: 'Delete a subscription' }) remove(
    @Param('id') id: string,
  ) {
    return this.svc.remove(id);
  }
}
