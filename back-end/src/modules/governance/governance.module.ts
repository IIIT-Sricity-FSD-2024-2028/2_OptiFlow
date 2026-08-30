import { Module } from '@nestjs/common';
import { GovernanceController } from './governance.controller';
import { PrismaModule } from '../../core/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GovernanceController],
})
export class GovernanceModule {}
