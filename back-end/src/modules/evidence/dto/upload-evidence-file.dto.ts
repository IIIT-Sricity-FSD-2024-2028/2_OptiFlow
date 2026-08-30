import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UploadEvidenceFileDto {
  @ApiPropertyOptional({ example: 'Additional context about this file.' })
  @IsOptional()
  @IsString()
  notes?: string;
}
