import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsEnum, IsOptional } from 'class-validator';

enum TaskStatus {
  Pending = 'Pending',
  In_Progress = 'In_Progress',
  In_Review = 'In_Review',
  Blocked = 'Blocked',
  Completed = 'Completed'
}

export class CreateTaskDto {
  @ApiProperty({ example: 'Complete Q1 Report' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  project_id: number;

  @ApiProperty({ example: 3 })
  @IsNumber()
  assigned_to: number;

  @ApiProperty({ example: 'High' })
  @IsString()
  priority: string;
}

export class UpdateTaskStatusDto {
  @ApiProperty({ enum: TaskStatus, example: TaskStatus.In_Review })
  @IsEnum(TaskStatus)
  status: TaskStatus;
}