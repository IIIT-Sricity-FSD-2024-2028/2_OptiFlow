import { Module } from '@nestjs/common';
import { PlansService } from './plans.service';
import { PlansController } from './plans.controller';

@Module({
  controllers: [PlansController],
  providers: [PlansService],
})
export class PlansModule {}
