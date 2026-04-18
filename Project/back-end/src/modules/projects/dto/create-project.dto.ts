import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ example: 'Compliance Audit' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Annual Audit' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  department_id: number;

  @ApiProperty({ example: 'Active' })
  @IsString()
  @IsNotEmpty()
  status: string;
}
