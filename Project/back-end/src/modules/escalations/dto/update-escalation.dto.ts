import { PartialType } from '@nestjs/swagger';
import { CreateEscalationDto } from './create-escalation.dto';

export class UpdateEscalationDto extends PartialType(CreateEscalationDto) {}
