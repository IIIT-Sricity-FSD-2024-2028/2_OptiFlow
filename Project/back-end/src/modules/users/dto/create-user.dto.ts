import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  full_name: string;

  @ApiProperty({ example: 'john@test.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'team_member' })
  @IsString()
  @IsNotEmpty()
  role: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  department_id: number;

  @ApiProperty({ example: 2, required: false })
  @IsOptional()
  @IsNumber()
  reports_to?: number;

  @ApiProperty({ example: 'Active' })
  @IsString()
  @IsNotEmpty()
  status: string;
}