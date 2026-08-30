import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class CreateBranchDto {
  @ApiProperty({ example: 'Hyderabad HQ' })
  @IsString()
  @IsNotEmpty()
  name: string;
}
