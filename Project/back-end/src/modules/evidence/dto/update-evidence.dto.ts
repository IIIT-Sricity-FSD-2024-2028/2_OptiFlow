import { PartialType } from '@nestjs/swagger';
import { CreateEvidenceDto } from './create-evidence.dto';
import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum EvidenceStatus {
  Pending = 'Pending',
  Under_Review = 'Under_Review',
  Approved = 'Approved',
  Rejected = 'Rejected',
}

export class UpdateEvidenceDto extends PartialType(CreateEvidenceDto) {
  @ApiPropertyOptional({ enum: EvidenceStatus, example: EvidenceStatus.Approved })
  @IsOptional()
  @IsEnum(EvidenceStatus)
  status?: EvidenceStatus;
}
