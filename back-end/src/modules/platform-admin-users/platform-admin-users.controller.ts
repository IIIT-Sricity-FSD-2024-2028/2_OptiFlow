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
import { PlatformAdminUsersService } from './platform-admin-users.service';
import { CreatePlatformAdminUserDto } from './dto/create-platform-admin-user.dto';
import { UpdatePlatformAdminUserDto } from './dto/update-platform-admin-user.dto';
import { PlatformAdminGuard } from '../../core/guards/platform-admin.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Platform Admin Users')
@Controller('platform-admin-users')
@UseGuards(PlatformAdminGuard)
@Roles('platform_admin')
export class PlatformAdminUsersController {
  constructor(private readonly svc: PlatformAdminUsersService) {}
  @Get() @ApiOperation({ summary: 'List all platform admin users' }) findAll() {
    return this.svc.findAll();
  }
  @Get(':id') @ApiOperation({ summary: 'Get a platform admin user' }) findOne(
    @Param('id') id: string,
  ) {
    return this.svc.findOne(id);
  }
  @Post() @ApiOperation({ summary: 'Create a platform admin user' }) create(
    @Body() dto: CreatePlatformAdminUserDto,
  ) {
    return this.svc.create(dto);
  }
  @Patch(':id')
  @ApiOperation({ summary: 'Update a platform admin user' })
  update(@Param('id') id: string, @Body() dto: UpdatePlatformAdminUserDto) {
    return this.svc.update(id, dto);
  }
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a platform admin user' })
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
