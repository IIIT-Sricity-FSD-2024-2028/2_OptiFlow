import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateEscalationDto {
  @ApiProperty({ example: 104 })
  @IsNumber()
  task_id: number;

  @ApiProperty({ example: 2 })
  @IsNumber()
  project_id: number;

  @ApiProperty({ example: 9 })
  @IsNumber()
  reported_by: number;

  @ApiProperty({ example: 8 })
  @IsNumber()
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
