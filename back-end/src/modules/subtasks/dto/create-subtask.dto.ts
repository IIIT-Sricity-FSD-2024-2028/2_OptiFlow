import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  Min,
  IsNumber,
} from 'class-validator';

export class CreateSubtaskDto {
  @ApiProperty({ example: 'comp-uuid-123' })
  @IsString()
  @IsNotEmpty()
  companyId: string;

  @ApiProperty({ example: 'task-uuid-101' })
  @IsString()
  @IsNotEmpty()
  task_id: string;

  @ApiProperty({ example: 'Export invoice data from ERP' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'Pull all Q4 invoices from SAP into a CSV.',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'user-uuid-4',
    description: 'Defaults to actor when omitted',
  })
  @IsOptional()
  @IsString()
  created_by?: string;

  @ApiProperty({ example: 'user-uuid-5', required: false })
  @IsOptional()
  @IsString()
  assigned_to?: string;

  @ApiProperty({ example: 'Draft', required: false })
  @IsOptional()
  @IsString()
  status?: any;

  @ApiProperty({ example: 2.5, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  estimated_hours?: number;

  @ApiProperty({ example: '2024-11-18', required: false })
  @IsOptional()
  @IsString()
  due_date?: string;
}
