import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export enum RoleTemplateOrigin {
  platform_predefined = 'platform_predefined',
  company_custom = 'company_custom',
}
export class CreateRoleTemplateDto {
  @ApiProperty({ enum: RoleTemplateOrigin })
  @IsEnum(RoleTemplateOrigin)
  origin: RoleTemplateOrigin;
  @ApiProperty({ example: 'Team Member' })
  @IsString()
  @IsNotEmpty()
  label: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  companyId?: string;
  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  permissionIds?: string[];
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  createdById?: string;
}
