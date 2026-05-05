import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateComplianceViolationDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  rule_id: number;

  @ApiProperty({ example: 10 })
  @IsNumber()
  entity_id: number;

  @ApiProperty({ example: 'User' })
  @IsString()
  @IsNotEmpty()
  entity_type: string;

  @ApiProperty({ example: 9, required: false })
  @IsOptional()
  @IsNumber()
  reported_by?: number;

  @ApiProperty({ example: '2024-12-10', required: false })
  @IsOptional()
  @IsString()
  due_date?: string;
}
