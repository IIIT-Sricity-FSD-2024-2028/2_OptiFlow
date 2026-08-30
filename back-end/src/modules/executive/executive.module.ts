import { Module } from '@nestjs/common';
import { ExecutiveController } from './executive.controller';

@Module({
  controllers: [ExecutiveController],
})
export class ExecutiveModule {}
