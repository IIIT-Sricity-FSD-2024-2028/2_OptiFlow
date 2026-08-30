import { Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { PrismaModule } from '../../core/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MetricsController],
})
export class MetricsModule {}
