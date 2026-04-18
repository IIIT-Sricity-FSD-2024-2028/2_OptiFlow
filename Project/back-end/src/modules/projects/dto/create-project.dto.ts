import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ example: 'ISO 27001 Certification' })
  @IsString()
  @IsNotEmpty()
  project_name: string;

  @ApiProperty({ example: 'Achieve ISO 27001 certification by Q2 2025.', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  department_id: number;

  @ApiProperty({ example: 'Active', required: false })
  @IsOptional()
  @IsString()
  status?: 'Planning' | 'Active' | 'On_Hold' | 'Completed' | 'Cancelled';

  @ApiProperty({ example: '2024-11-01' })
  @IsString()
  @IsNotEmpty()
  start_date: string;

  @ApiProperty({ example: '2025-05-31', required: false })
  @IsOptional()
  @IsString()
  end_date?: string;

  @ApiProperty({ example: 3 })
  @IsNumber()
  created_by: number;
}
