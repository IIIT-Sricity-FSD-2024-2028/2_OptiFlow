import { PartialType } from '@nestjs/swagger';
import { CreateProcessTemplateDto } from './create-process-template.dto';
export class UpdateProcessTemplateDto extends PartialType(
  CreateProcessTemplateDto,
) {}
