import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CreateEscalationDto } from './create-escalation.dto';

export class UpdateEscalationDto extends PartialType(CreateEscalationDto) {
  @ApiPropertyOptional({ enum: ['Open', 'Reviewed', 'Resolved', 'Closed'], example: 'Resolved' })
  @IsOptional()
  @IsString()
  status?: 'Open' | 'Reviewed' | 'Resolved' | 'Closed';
}
