import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'Team Leader' })
  @IsString()
  @IsNotEmpty()
  role_name: string;

  @ApiProperty({ example: 'Leads a team and assigns tasks', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  is_system?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  permissions?: Record<string, boolean>;

  @ApiProperty({ example: 'template-uuid-1', required: false })
  @IsOptional()
  @IsString()
  roleTemplateId?: string;

  @ApiProperty({ example: 'comp-uuid-123', required: false })
  @IsOptional()
  @IsString()
  companyId?: string;
}
