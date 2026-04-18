import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateTaskDto {
  @ApiProperty({ example: 'Reconcile vendor invoices' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Cross-check all vendor invoices against PO records.', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsNumber()
  project_id?: number;

  @ApiProperty({ example: 4 })
  @IsNumber()
  created_by: number;

  @ApiProperty({ example: 5 })
  @IsNumber()
  assigned_to: number;

  @ApiProperty({ example: 'High', required: false })
  @IsOptional()
  @IsString()
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';

  @ApiProperty({ example: 'Pending', required: false })
  @IsOptional()
  @IsString()
  status?: 'Pending' | 'In_Progress' | 'In_Review' | 'Blocked' | 'Completed' | 'Cancelled';

  @ApiProperty({ example: 8, required: false })
  @IsOptional()
  @IsNumber()
  estimated_hours?: number;

  @ApiProperty({ example: '2024-11-20', required: false })
  @IsOptional()
  @IsString()
  due_date?: string;
}
