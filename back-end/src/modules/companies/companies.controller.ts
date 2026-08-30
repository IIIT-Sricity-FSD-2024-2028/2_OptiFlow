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
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { RegisterCompanyDto } from './dto/register-company.dto';
import { PlatformAdminGuard } from '../../core/guards/platform-admin.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Companies')
@Controller('companies')
export class CompaniesController {
  constructor(private readonly svc: CompaniesService) {}

  @Post('register')
  @ApiOperation({
    summary:
      'Register a new company and onboard company owner with platform defaults',
  })
  @ApiResponse({
    status: 201,
    description: 'Company registered and seeded successfully.',
  })
  register(@Body() dto: RegisterCompanyDto) {
    return this.svc.registerCompany(dto);
  }

  @Get()
  @UseGuards(PlatformAdminGuard)
  @Roles('platform_admin')
  @ApiOperation({ summary: 'List all companies (platform_admin)' })
  findAll() {
    return this.svc.findAll();
  }

  @Get(':id')
  @UseGuards(PlatformAdminGuard)
  @Roles('platform_admin')
  @ApiOperation({ summary: 'Get a company (platform_admin)' })
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  @UseGuards(PlatformAdminGuard)
  @Roles('platform_admin')
  @ApiOperation({ summary: 'Create a company (platform_admin)' })
  create(@Body() dto: CreateCompanyDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  @UseGuards(PlatformAdminGuard)
  @Roles('platform_admin')
  @ApiOperation({ summary: 'Update a company (platform_admin)' })
  update(@Param('id') id: string, @Body() dto: UpdateCompanyDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(PlatformAdminGuard)
  @Roles('platform_admin')
  @ApiOperation({ summary: 'Delete a company (platform_admin)' })
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
