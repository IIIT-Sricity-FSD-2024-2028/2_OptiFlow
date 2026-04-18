import { Module } from '@nestjs/common';
import { SubtasksService } from './subtasks.service';
import { SubtasksController } from './subtasks.controller';
import { DatabaseModule } from '../../core/database/database.module';

@Module({ imports: [DatabaseModule], controllers: [SubtasksController], providers: [SubtasksService] })
export class SubtasksModule {}
