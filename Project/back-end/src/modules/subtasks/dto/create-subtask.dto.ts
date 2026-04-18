import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateSubtaskDto {
  @ApiProperty({ example: 101 })
  @IsNumber()
  task_id: number;

  @ApiProperty({ example: 'Export invoice data from ERP' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Pull all Q4 invoices from SAP into a CSV.', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 5 })
  @IsNumber()
  assigned_to: number;

  @ApiProperty({ example: 'Pending', required: false })
  @IsOptional()
  @IsString()
  status?: 'Pending' | 'In_Progress' | 'In_Review' | 'Blocked' | 'Completed' | 'Cancelled';

  @ApiProperty({ example: 2.5, required: false })
  @IsOptional()
  @IsNumber()
  estimated_hours?: number;

  @ApiProperty({ example: '2024-11-18', required: false })
  @IsOptional()
  @IsString()
  due_date?: string;
}
