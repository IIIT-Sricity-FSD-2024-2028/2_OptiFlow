import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreatePlatformSupportAccessDto } from './create-platform-support-access.dto';
import { IsOptional, IsArray } from 'class-validator';

export class UpdatePlatformSupportAccessDto extends PartialType(
  CreatePlatformSupportAccessDto,
) {
  @ApiPropertyOptional({
    description: 'Audit log of actions taken during support session',
    type: [Object],
  })
  @IsOptional()
  @IsArray()
  actionLog?: Record<string, any>[];
}
