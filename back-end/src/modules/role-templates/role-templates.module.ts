import { Module } from '@nestjs/common';
import { RoleTemplatesController } from './role-templates.controller';
import { RoleTemplatesService } from './role-templates.service';
@Module({
  controllers: [RoleTemplatesController],
  providers: [RoleTemplatesService],
})
export class RoleTemplatesModule {}
