import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PlanLimitService } from '../services/plan-limit.service';

@Global()
@Module({
  providers: [PrismaService, PlanLimitService],
  exports: [PrismaService, PlanLimitService],
})
export class PrismaModule {}
