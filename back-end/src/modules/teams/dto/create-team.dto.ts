import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class CreateTeamDto {
  @ApiProperty({ example: 'Ops-Admin' })
  @IsString()
  @IsNotEmpty()
  team_name: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  department_id: number;
}
