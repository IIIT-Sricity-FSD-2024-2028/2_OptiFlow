import {
  IsEmail,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePlatformAdminUserDto {
  @ApiProperty({ example: 'admin@saas.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    example: 'PlatformAdmin123!',
    description: 'Plain text password (auto-hashed)',
  })
  @IsString()
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({
    example: '$2a$10$...',
    description: 'Bcrypt password hash (legacy/migration)',
  })
  @IsString()
  @IsOptional()
  passwordHash?: string;

  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
