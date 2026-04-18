import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'Arjun Mehta' })
  @IsString()
  @IsNotEmpty()
  full_name: string;

  @ApiProperty({ example: 'arjun@officesync.in' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'hashed_password', required: false })
  @IsOptional()
  @IsString()
  password_hash?: string;

  @ApiProperty({ example: 'team_member' })
  @IsString()
  @IsNotEmpty()
  role: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  department_id: number;

  @ApiProperty({ example: 4, required: false })
  @IsOptional()
  @IsNumber()
  manager_id?: number;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}