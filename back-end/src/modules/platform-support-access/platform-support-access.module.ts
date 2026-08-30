import { Module } from '@nestjs/common';
import { PlatformSupportAccessController } from './platform-support-access.controller';
import { PlatformSupportAccessService } from './platform-support-access.service';
@Module({
  controllers: [PlatformSupportAccessController],
  providers: [PlatformSupportAccessService],
})
export class PlatformSupportAccessModule {}
