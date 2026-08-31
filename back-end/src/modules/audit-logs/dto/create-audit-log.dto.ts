import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateAuditLogDto {
  @ApiProperty({ example: 'comp-uuid-123', required: false })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiProperty({ example: 'task-uuid-123', required: false })
  @IsOptional()
  entity_id?: string | number;

  @ApiProperty({ example: 'task-uuid-123', required: false })
  @IsOptional()
  entityId?: string | number;

  @ApiProperty({ example: 'Task', required: false })
  @IsOptional()
  @IsString()
  entity_type?: string;

  @ApiProperty({ example: 'Task', required: false })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiProperty({ example: 'STATUS_CHANGE' })
  @IsString()
  @IsNotEmpty()
  action: string;

  @ApiProperty({ example: 'user-uuid-2', required: false })
  @IsOptional()
  performed_by?: string | number;

  @ApiProperty({ example: 'user-uuid-2', required: false })
  @IsOptional()
  performedBy?: string | number;

  @ApiProperty({ example: '10.0.1.22', required: false })
  @IsOptional()
  @IsString()
  ip_address?: string;

  @ApiProperty({ example: '10.0.1.22', required: false })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  old_value?: any;

  @ApiProperty({ required: false })
  @IsOptional()
  oldValue?: any;

  @ApiProperty({ required: false })
  @IsOptional()
  new_value?: any;

  @ApiProperty({ required: false })
  @IsOptional()
  newValue?: any;

  @ApiProperty({ example: 'user:create', required: false })
  @IsOptional()
  @IsString()
  usedPermissionSlug?: string;

  @ApiProperty({ example: 'Mozilla/5.0 ...', required: false })
  @IsOptional()
  @IsString()
  userAgent?: string;
}
