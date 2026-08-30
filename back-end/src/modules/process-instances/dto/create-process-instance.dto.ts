import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export enum ProcessInstanceStatus {
  Draft = 'Draft',
  Active = 'Active',
  Completed = 'Completed',
  Cancelled = 'Cancelled',
  Rejected = 'Rejected',
}
export class CreateProcessInstanceDto {
  @ApiProperty() @IsString() @IsNotEmpty() templateId: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  projectId?: string;
  @ApiProperty() @IsString() @IsNotEmpty() title: string;
  @ApiProperty({ enum: ProcessInstanceStatus, required: false })
  @IsOptional()
  @IsEnum(ProcessInstanceStatus)
  status?: ProcessInstanceStatus;
  @ApiProperty() @IsString() @IsNotEmpty() initiatedById: string;
}
