import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'team_leader' })
  @IsString()
  @IsNotEmpty()
  role_name: string;

  @ApiProperty({ example: 'Leads a team and assigns tasks' })
  @IsString()
  description: string;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  is_system?: boolean;
}
