import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsInt, IsOptional, Min, IsNumber } from 'class-validator';

export class CreateSubtaskDto {
  @ApiProperty({ example: 101 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  task_id: number;

  @ApiProperty({ example: 'Export invoice data from ERP' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Pull all Q4 invoices from SAP into a CSV.', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 4, description: 'Defaults to x-user-id actor when omitted' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  created_by?: number;

  @ApiProperty({ example: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  assigned_to: number;

  @ApiProperty({ example: 'Pending', required: false })
  @IsOptional()
  @IsString()
  status?: 'Pending' | 'In_Progress' | 'In_Review' | 'Blocked' | 'Completed' | 'Cancelled';

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
