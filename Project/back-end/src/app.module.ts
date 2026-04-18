import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './core/database/database.module';
import { UsersModule } from './modules/users/users.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { EscalationsModule } from './modules/escalations/escalations.module';
import { EvidenceModule } from './modules/evidence/evidence.module';

@Module({
  imports: [
    DatabaseModule, 
    UsersModule, 
    TasksModule, 
    ProjectsModule, 
    EscalationsModule, 
    EvidenceModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
