import { Module } from '@nestjs/common';
import { PlatformAdminController } from './platform.controller';

@Module({
  controllers: [PlatformAdminController],
})
export class PlatformModule {}
