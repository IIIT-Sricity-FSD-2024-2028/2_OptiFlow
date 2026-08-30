import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  Min,
  IsNumber,
} from 'class-validator';

export class CreateTaskDto {
  @ApiProperty({ example: 'comp-uuid-123' })
  @IsString()
  @IsNotEmpty()
  companyId: string;

  @ApiProperty({ example: 'Reconcile vendor invoices' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'Cross-check all vendor invoices against PO records.',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'proj-uuid-1', required: false })
  @IsOptional()
  @IsString()
  project_id?: string;

  @ApiProperty({ example: 'user-uuid-4', required: false })
  @IsOptional()
  @IsString()
  created_by?: string;

  @ApiProperty({ example: 'user-uuid-5', required: false })
  @IsOptional()
  @IsString()
  assigned_to?: string;

  @ApiProperty({ example: 'High', required: false })
  @IsOptional()
  @IsString()
  priority?: any;

  @ApiProperty({ example: 'Active', required: false })
  @IsOptional()
  @IsString()
  status?: any;

  @ApiProperty({ example: 8, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  estimated_hours?: number;

  @ApiProperty({ example: 4.5, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  actual_hours?: number;

  @ApiProperty({ example: '2024-11-20', required: false })
  @IsOptional()
  @IsString()
  due_date?: string;

  @ApiProperty({ example: 'step-uuid-10', required: false })
  @IsOptional()
  @IsString()
  processInstanceStepId?: string;
}
