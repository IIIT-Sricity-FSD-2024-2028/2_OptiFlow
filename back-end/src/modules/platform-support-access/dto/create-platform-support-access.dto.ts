import { IsString, IsNotEmpty, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class CreatePlatformSupportAccessDto {
  @ApiProperty() @IsString() @IsNotEmpty() adminUserId: string;
  @ApiProperty() @IsString() @IsNotEmpty() companyId: string;
  @ApiProperty() @IsString() @IsNotEmpty() reason: string;
  @ApiProperty({ example: '2026-09-01T00:00:00Z' })
  @IsDateString()
  expiresAt: string;
}
