import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class CreateTaskDto {
  @ApiProperty({ example: 'Complete Report' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  project_id: number;

  @ApiProperty({ example: 2 })
  @IsNumber()
  assigned_to: number;

  @ApiProperty({ example: 'High' })
  @IsString()
  @IsNotEmpty()
  priority: string;

  @ApiProperty({ example: 'Pending' })
  @IsString()
  @IsNotEmpty()
  status: string;
}
