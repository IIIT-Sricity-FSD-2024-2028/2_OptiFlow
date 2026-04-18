import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class CreateComplianceRuleDto {
  @ApiProperty({ example: 'Task Due Date Overdue > 7 Days' })
  @IsString()
  @IsNotEmpty()
  rule_name: string;

  @ApiProperty({ example: 'Any task overdue by more than 7 days must be escalated.' })
  @IsString()
  description: string;

  @ApiProperty({ example: 'Reassign task or extend deadline with PM approval.' })
  @IsString()
  remediation_steps: string;

  @ApiProperty({ example: 'High', enum: ['Low', 'Medium', 'High', 'Critical'] })
  @IsString()
  severity: 'Low' | 'Medium' | 'High' | 'Critical';

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
