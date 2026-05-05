import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateEvidenceDto {
  @ApiProperty({ example: 9 })
  @IsNumber()
  user_id: number;

  @ApiProperty({ example: 104, required: false })
  @IsOptional()
  @IsNumber()
  task_id?: number;

  @ApiProperty({ example: 2, required: false })
  @IsOptional()
  @IsNumber()
  violation_id?: number;

  @ApiProperty({ example: 'Server patch test results' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Document', required: false })
  @IsOptional()
  @IsString()
  evidence_type?: string;

  @ApiProperty({ example: 'https://storage.officesync.in/evidence/report.pdf' })
  @IsString()
  @IsNotEmpty()
  file_url: string;

  @ApiProperty({ example: 'Partial test results from staging.', required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
