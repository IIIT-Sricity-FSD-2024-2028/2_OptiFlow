import { IsString, IsNotEmpty, IsBoolean, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReplyDto {
  @ApiProperty({ example: 'We have looked into your access issue and reset your credentials.', description: 'Reply body (min 5 chars)' })
  @IsString()
  @MinLength(5)
  body: string;

  @ApiPropertyOptional({ description: 'If true, this reply is only visible to RM team (internal note)', default: false })
  @IsBoolean()
  is_internal: boolean = false;
}
