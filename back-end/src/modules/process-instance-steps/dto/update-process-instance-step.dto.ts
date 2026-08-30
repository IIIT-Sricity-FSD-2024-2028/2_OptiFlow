import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export enum StepStatus {
  Approved = 'Approved',
  Rejected = 'Rejected',
  Skipped = 'Skipped',
}
export class UpdateProcessInstanceStepDto {
  @ApiProperty({ enum: StepStatus }) @IsEnum(StepStatus) status: StepStatus;
  @ApiProperty({ required: false }) @IsOptional() @IsString() remarks?: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  actionedById?: string;
}
