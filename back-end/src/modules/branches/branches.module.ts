import { Module } from '@nestjs/common';
import { BranchesController } from './branches.controller';
import { BranchesService } from './branches.service';
@Module({ controllers: [BranchesController], providers: [BranchesService] })
export class BranchesModule {}
