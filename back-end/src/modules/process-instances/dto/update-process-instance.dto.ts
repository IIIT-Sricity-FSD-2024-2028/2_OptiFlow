import { PartialType } from '@nestjs/swagger';
import { CreateProcessInstanceDto } from './create-process-instance.dto';
export class UpdateProcessInstanceDto extends PartialType(
  CreateProcessInstanceDto,
) {}
