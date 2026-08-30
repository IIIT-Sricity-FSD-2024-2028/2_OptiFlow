import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsBoolean,
  IsArray,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProcessTemplateStepDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() id?: string;
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() stepOrder?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() stepType?: any;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  requiredPermissionId?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  escalationTimeoutHours?: number;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  onRejectGotoStepId?: string;
}

export class CreateProcessTemplateDto {
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() category?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() version?: number;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  createdById?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  compliance?: string[];
  @ApiProperty({ required: false, type: () => [CreateProcessTemplateStepDto] })
  @IsOptional()
  @IsArray()
  steps?: Array<CreateProcessTemplateStepDto | string>;
}
