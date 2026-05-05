import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { DatabaseModule } from '../../core/database/database.module';

@Module({ imports: [DatabaseModule], controllers: [RolesController], providers: [RolesService] })
export class RolesModule {}
