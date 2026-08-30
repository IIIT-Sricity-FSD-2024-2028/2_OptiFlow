import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class CreateComplianceCategoryDto {
  @ApiProperty({ example: 'Data Privacy' })
  @IsString()
  @IsNotEmpty()
  name: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() ownerId?: string;
}
