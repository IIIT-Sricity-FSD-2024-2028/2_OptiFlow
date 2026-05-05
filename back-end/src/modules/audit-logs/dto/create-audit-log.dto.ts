import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateAuditLogDto {
  @ApiProperty({ example: 5 })
  @IsNumber()
  entity_id: number;

  @ApiProperty({ example: 'User' })
  @IsString()
  @IsNotEmpty()
  entity_type: string;

  @ApiProperty({ example: 'STATUS_CHANGE' })
  @IsString()
  @IsNotEmpty()
  action: string;

  @ApiProperty({ example: 2, required: false })
  @IsOptional()
  @IsNumber()
  performed_by?: number;

  @ApiProperty({ example: '10.0.1.22', required: false })
  @IsOptional()
  @IsString()
  ip_address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  old_value?: object;

  @ApiProperty({ required: false })
  @IsOptional()
  new_value?: object;
}
