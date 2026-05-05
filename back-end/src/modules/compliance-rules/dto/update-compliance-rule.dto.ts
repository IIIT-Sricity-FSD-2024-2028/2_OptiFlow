import { PartialType } from '@nestjs/swagger';
import { CreateComplianceRuleDto } from './create-compliance-rule.dto';
export class UpdateComplianceRuleDto extends PartialType(CreateComplianceRuleDto) {}
