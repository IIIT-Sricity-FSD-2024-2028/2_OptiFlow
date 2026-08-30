import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { PlansService } from './plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { PlatformAdminGuard } from '../../core/guards/platform-admin.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Plans')
@Controller('plans')
@UseGuards(PlatformAdminGuard)
@Roles('platform_admin')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new plan (platform_admin)' })
  @ApiResponse({ status: 201, description: 'Successfully created.' })
  create(@Body() createPlanDto: CreatePlanDto) {
    return this.plansService.create(createPlanDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all plans (platform_admin)' })
  @ApiResponse({ status: 200, description: 'Successful operation.' })
  findAll() {
    return this.plansService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a plan by ID (platform_admin)' })
  @ApiResponse({ status: 200, description: 'Successful operation.' })
  findOne(@Param('id') id: string) {
    return this.plansService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a plan (platform_admin)' })
  @ApiResponse({ status: 200, description: 'Successful operation.' })
  update(@Param('id') id: string, @Body() updatePlanDto: UpdatePlanDto) {
    return this.plansService.update(id, updatePlanDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a plan (platform_admin)' })
  @ApiResponse({ status: 200, description: 'Successful operation.' })
  remove(@Param('id') id: string) {
    return this.plansService.remove(id);
  }
}
