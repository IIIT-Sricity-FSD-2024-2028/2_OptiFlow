import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  MinLength,
} from 'class-validator';

export class RegisterCompanyDto {
  @ApiProperty({
    description: 'Legal Name of the Company',
    example: 'Acme Innovation Corp',
  })
  @IsString()
  @IsNotEmpty()
  companyLegalName: string;

  @ApiProperty({
    description: 'Full Name of Company Owner / CEO',
    example: 'Sarah Connor',
  })
  @IsString()
  @IsNotEmpty()
  ownerFullName: string;

  @ApiProperty({
    description: 'Email address of Company Owner',
    example: 'owner@acme-innovation.com',
  })
  @IsEmail()
  @IsNotEmpty()
  ownerEmail: string;

  @ApiProperty({
    description: 'Account password for Company Owner',
    example: 'Password123!',
  })
  @IsString()
  @MinLength(6)
  ownerPassword: string;

  @ApiPropertyOptional({ description: 'Selected Plan Name', example: 'Growth' })
  @IsString()
  @IsOptional()
  planName?: string;
}
