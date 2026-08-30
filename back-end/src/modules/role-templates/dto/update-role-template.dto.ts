import { PartialType } from '@nestjs/swagger';
import { CreateRoleTemplateDto } from './create-role-template.dto';
export class UpdateRoleTemplateDto extends PartialType(CreateRoleTemplateDto) {}
