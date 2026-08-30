import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export enum ScopeType {
  Company = 'Company',
  Branch = 'Branch',
  Team = 'Team',
  Project = 'Project',
}
export class CreateComplianceBindingDto {
  @ApiProperty() @IsString() @IsNotEmpty() ruleId: string;
  @ApiProperty({ enum: ScopeType }) @IsEnum(ScopeType) scopeType: ScopeType;
  @ApiProperty() @IsString() @IsNotEmpty() scopeId: string;
}
