import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'Arjun Mehta' })
  @IsString()
  @IsNotEmpty()
  full_name: string;

  @ApiProperty({ example: 'arjun@acme.test' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123!', required: false })
  @IsOptional()
  @IsString()
  password_hash?: string;

  @ApiProperty({ example: 'user-uuid-123', required: false })
  @IsOptional()
  @IsString()
  managerUserId?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiProperty({ example: 'Team Member', required: false })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiProperty({ example: '+91 9876543210', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'comp-uuid-123' })
  @IsString()
  @IsNotEmpty()
  companyId: string;

  @ApiProperty({ example: 'branch-uuid-456', required: false })
  @IsOptional()
  @IsString()
  branchId?: string;
}
