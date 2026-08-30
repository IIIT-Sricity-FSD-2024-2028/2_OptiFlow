import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProcessInstanceStepDto {
  @ApiProperty() @IsString() @IsNotEmpty() processInstanceId: string;
  @ApiProperty() @IsString() @IsNotEmpty() templateStepId: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  assignedToId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() status?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() remarks?: string;
}
