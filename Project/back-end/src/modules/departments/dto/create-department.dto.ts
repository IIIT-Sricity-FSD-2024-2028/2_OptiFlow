import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateDepartmentDto {
  @ApiProperty({ example: 'Finance' })
  @IsString()
  @IsNotEmpty()
  department_name: string;

  @ApiProperty({ example: 6, required: false })
  @IsOptional()
  @IsNumber()
  manager_id?: number;
}
