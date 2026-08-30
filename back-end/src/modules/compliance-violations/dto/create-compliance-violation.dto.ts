import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateComplianceViolationDto {
  @ApiProperty({ example: 'comp-uuid-1' })
  @IsString()
  @IsNotEmpty()
  companyId: string;

  @ApiProperty({ example: 'rule-uuid-1' })
  @IsString()
  @IsNotEmpty()
  rule_id: string;

  @ApiProperty({ example: 'task-uuid-10' })
  @IsString()
  @IsNotEmpty()
  entity_id: string;

  @ApiProperty({ example: 'Task' })
  @IsString()
  @IsNotEmpty()
  entity_type: string;

  @ApiProperty({ example: 'user-uuid-9', required: false })
  @IsOptional()
  @IsString()
  reported_by?: string;

  @ApiProperty({ example: '2024-12-10', required: false })
  @IsOptional()
  @IsString()
  due_date?: string;

  @ApiProperty({ example: 'High', required: false })
  @IsOptional()
  @IsString()
  severity?: any;
}
