import { Module } from '@nestjs/common';
import { EvidenceService } from './evidence.service';
import { EvidenceController } from './evidence.controller';

@Module({
  controllers: [EvidenceController],
  providers: [EvidenceService],
})
export class EvidenceModule {}
