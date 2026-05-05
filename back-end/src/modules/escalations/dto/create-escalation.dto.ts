import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsInt, IsOptional, Min } from 'class-validator';

export class CreateEscalationDto {
  @ApiProperty({ example: 104 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  task_id: number;

  @ApiProperty({ example: 2 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  project_id: number;

  @ApiProperty({ example: 9 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  reported_by: number;

  @ApiProperty({ example: 8 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  target_manager_id: number;

  @ApiProperty({ example: 'Staging server down' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Staging has been unreachable for 3 days.', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'System Issue', required: false })
  @IsOptional()
  @IsString()
  blocker_type?: string;

  @ApiProperty({ example: 'Critical', required: false })
  @IsOptional()
  @IsString()
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
}
