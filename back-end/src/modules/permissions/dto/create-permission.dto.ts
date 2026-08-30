import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class CreatePermissionDto {
  @ApiProperty({ example: 'task:read' }) @IsString() @IsNotEmpty() slug: string;
  @ApiProperty({ example: 'Tasks' }) @IsString() @IsNotEmpty() module: string;
  @ApiProperty({ example: 'Allows reading tasks' })
  @IsString()
  @IsNotEmpty()
  description: string;
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  companyId?: string;
}
