import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateTeamDto {
  @ApiProperty({ example: 'Ops-Admin' })
  @IsString()
  @IsNotEmpty()
  team_name: string;

  @ApiProperty({ example: 'branch-uuid-123' })
  @IsString()
  @IsNotEmpty()
  branchId: string;
}
