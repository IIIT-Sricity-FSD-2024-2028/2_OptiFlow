import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
} from 'class-validator';

export class CreatePlanDto {
  @ApiProperty({ example: 'Enterprise' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxBranches?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUsers?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxActiveProcessTemplates?: number;

  @ApiPropertyOptional({ example: 25 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxComplianceRules?: number;

  @ApiProperty({ example: 365 })
  @IsNumber()
  @Min(1)
  auditLogRetentionDays: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  allowsIntegrations: boolean;

  @ApiPropertyOptional({ example: 99.99 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyPrice?: number;

  @ApiPropertyOptional({ example: 999.99 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  annualPrice?: number;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ example: 8500 })
  @IsNumber()
  @Min(0)
  priceMonthly: number;

  @ApiProperty({ example: 82000 })
  @IsNumber()
  @Min(0)
  priceYearly: number;
}
