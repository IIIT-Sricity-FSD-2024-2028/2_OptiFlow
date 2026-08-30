import { Module } from '@nestjs/common';
import { PlatformAdminUsersController } from './platform-admin-users.controller';
import { PlatformAdminUsersService } from './platform-admin-users.service';
@Module({
  controllers: [PlatformAdminUsersController],
  providers: [PlatformAdminUsersService],
})
export class PlatformAdminUsersModule {}
