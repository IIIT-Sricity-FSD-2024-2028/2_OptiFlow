import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsInt, IsOptional, Min, IsNumber } from 'class-validator';

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
  @Type(() => Number)
  @IsInt()
  @Min(1)
  project_id?: number;

  @ApiProperty({ example: 4 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  created_by: number;

  @ApiProperty({ example: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  assigned_to: number;

  @ApiProperty({ example: 'High', required: false })
  @IsOptional()
  @IsString()
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';

  @ApiProperty({
    example: 'Pending',
    required: false,
    enum: [
      'Pending',
      'In_Progress',
      'In_Review',
      'Blocked',
      'Completed',
      'Cancelled',
      'Pending_TL_Review',
      'Pending_PM_Review',
      'Pending_Compliance',
    ],
  })
  @IsOptional()
  @IsString()
  status?:
    | 'Pending'
    | 'In_Progress'
    | 'In_Review'
    | 'Pending_TL_Review'
    | 'Blocked'
    | 'Completed'
    | 'Cancelled'
    | 'Pending_PM_Review'
    | 'Pending_Compliance';

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
}
