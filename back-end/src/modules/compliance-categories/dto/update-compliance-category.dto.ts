import { PartialType } from '@nestjs/swagger';
import { CreateComplianceCategoryDto } from './create-compliance-category.dto';
export class UpdateComplianceCategoryDto extends PartialType(
  CreateComplianceCategoryDto,
) {}
