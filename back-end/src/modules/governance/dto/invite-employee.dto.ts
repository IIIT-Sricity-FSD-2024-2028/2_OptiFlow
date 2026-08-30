import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class InviteEmployeeDto {
  @ApiProperty({ example: 'director@acme.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Jane Branch' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Company role id' })
  @IsUUID()
  roleId: string;

  @ApiPropertyOptional({ description: 'Required when role is Branch Manager' })
  @IsOptional()
  @IsUUID()
  branchId?: string;
}
