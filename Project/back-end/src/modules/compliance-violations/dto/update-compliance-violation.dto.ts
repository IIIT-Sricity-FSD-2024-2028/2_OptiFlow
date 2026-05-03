import { IsOptional, IsString } from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { CreateComplianceViolationDto } from './create-compliance-violation.dto';
export class UpdateComplianceViolationDto extends PartialType(CreateComplianceViolationDto) {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  resolution_remarks?: string;

  @IsOptional()
  @IsString()
  resolved_at?: string;
}
