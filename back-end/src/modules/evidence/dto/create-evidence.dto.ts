import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateEvidenceDto {
  @ApiProperty({ example: 'comp-uuid-1' })
  @IsString()
  @IsNotEmpty()
  companyId: string;

  @ApiProperty({ example: 'user-uuid-9' })
  @IsString()
  @IsNotEmpty()
  user_id: string;

  @ApiProperty({ example: 'task-uuid-104', required: false })
  @IsOptional()
  @IsString()
  task_id?: string;

  @ApiProperty({ example: 'violation-uuid-2', required: false })
  @IsOptional()
  @IsString()
  violation_id?: string;

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

  @ApiProperty({
    example: 'Partial test results from staging.',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
