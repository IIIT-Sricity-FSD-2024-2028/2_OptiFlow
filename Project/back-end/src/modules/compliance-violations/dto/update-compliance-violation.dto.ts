import { PartialType } from '@nestjs/swagger';
import { CreateComplianceViolationDto } from './create-compliance-violation.dto';
export class UpdateComplianceViolationDto extends PartialType(CreateComplianceViolationDto) {}
