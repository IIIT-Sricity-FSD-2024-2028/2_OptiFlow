import { Module } from '@nestjs/common';
import { RoleAssignmentsController } from './role-assignments.controller';
import { RoleAssignmentsService } from './role-assignments.service';
@Module({
  controllers: [RoleAssignmentsController],
  providers: [RoleAssignmentsService],
})
export class RoleAssignmentsModule {}
