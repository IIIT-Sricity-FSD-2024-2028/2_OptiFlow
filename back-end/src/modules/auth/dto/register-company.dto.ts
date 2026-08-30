import { IsString, IsEmail, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterCompanyDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  companyLegalName: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  ownerFullName: string;

  @ApiProperty()
  @IsEmail()
  ownerEmail: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(32)
  password: string;

  @ApiProperty({ example: 'plan-uuid-here' })
  @IsString()
  planId: string;

  @ApiProperty({ example: 'MONTHLY', description: 'MONTHLY or YEARLY' })
  @IsString()
  billingCycle: string;
}
