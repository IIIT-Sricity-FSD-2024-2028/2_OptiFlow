import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class CreateEscalationDto {
  @ApiProperty({ example: 101 })
  @IsNumber()
  task_id: number;

  @ApiProperty({ example: 2 })
  @IsNumber()
  raised_by: number;

  @ApiProperty({ example: 'Blocked by dependency' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({ example: 'Open' })
  @IsString()
  @IsNotEmpty()
  status: string;
}
