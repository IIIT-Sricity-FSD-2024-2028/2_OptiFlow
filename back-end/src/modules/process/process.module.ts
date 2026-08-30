import { Module } from '@nestjs/common';
import { ProcessController } from './process.controller';
import { ProcessTemplatesModule } from '../process-templates/process-templates.module';
import { PrismaModule } from '../../core/prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    ProcessTemplatesModule,   // provides ProcessTemplatesService
  ],
  controllers: [ProcessController],
})
export class ProcessModule {}
