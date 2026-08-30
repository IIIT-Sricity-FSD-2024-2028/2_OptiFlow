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
import { PlatformSupportAccessService } from './platform-support-access.service';
import { CreatePlatformSupportAccessDto } from './dto/create-platform-support-access.dto';
import { UpdatePlatformSupportAccessDto } from './dto/update-platform-support-access.dto';
import { PlatformAdminGuard } from '../../core/guards/platform-admin.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { PlatformAdminId } from '../../core/decorators/platform-admin.decorators';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Platform Support Access')
@Controller('platform-support-access')
@UseGuards(PlatformAdminGuard)
@Roles('platform_admin')
export class PlatformSupportAccessController {
  constructor(private readonly svc: PlatformSupportAccessService) {}

  @Get()
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'adminUserId', required: false })
  @ApiOperation({ summary: 'List support accesses' })
  findAll(
    @Query('companyId') companyId?: string,
    @Query('adminUserId') adminUserId?: string,
  ) {
    return this.svc.findAll(companyId, adminUserId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a support access' })
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Grant support access' })
  create(
    @Body() dto: CreatePlatformSupportAccessDto,
    @PlatformAdminId() adminId: string,
  ) {
    return this.svc.create(dto, adminId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a support access' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePlatformSupportAccessDto,
    @PlatformAdminId() adminId: string,
  ) {
    return this.svc.update(id, dto, adminId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Revoke support access' })
  remove(@Param('id') id: string, @PlatformAdminId() adminId: string) {
    return this.svc.remove(id, adminId);
  }
}
