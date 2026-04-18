import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class CreateEvidenceDto {
  @ApiProperty({ example: 101 })
  @IsNumber()
  task_id: number;

  @ApiProperty({ example: 2 })
  @IsNumber()
  submitted_by: number;

  @ApiProperty({ example: 'https://storage/report.pdf' })
  @IsString()
  @IsNotEmpty()
  file_url: string;

  @ApiProperty({ example: 'Pending Review' })
  @IsString()
  @IsNotEmpty()
  status: string;
}
