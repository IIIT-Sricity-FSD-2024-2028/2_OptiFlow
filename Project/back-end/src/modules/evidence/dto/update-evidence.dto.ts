import { PartialType } from '@nestjs/swagger';
import { CreateEvidenceDto } from './create-evidence.dto';

export class UpdateEvidenceDto extends PartialType(CreateEvidenceDto) {}
