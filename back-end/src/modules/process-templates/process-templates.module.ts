import { Module } from '@nestjs/common';
import { ProcessTemplatesController } from './process-templates.controller';
import { ProcessTemplatesService } from './process-templates.service';

@Module({
  controllers: [ProcessTemplatesController],
  providers: [ProcessTemplatesService],
  exports: [ProcessTemplatesService],   // ← allow sibling modules to inject
})
export class ProcessTemplatesModule {}
