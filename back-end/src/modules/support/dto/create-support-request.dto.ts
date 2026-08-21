import { IsString, IsNotEmpty, IsEnum, IsOptional, IsBoolean, IsNumber, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSupportRequestDto {
  @ApiProperty({ example: 'Access Issue', description: 'Support category' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ example: 'Cannot access SAP Finance module', description: 'Short subject line (min 5 chars)' })
  @IsString()
  @MinLength(5)
  subject: string;

  @ApiProperty({ example: 'I have been unable to log into the SAP Finance module since Monday...', description: 'Full description (min 20 chars)' })
  @IsString()
  @MinLength(20)
  description: string;

  @ApiProperty({ enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' })
  @IsEnum(['Low', 'Medium', 'High', 'Critical'])
  priority: 'Low' | 'Medium' | 'High' | 'Critical';

  @ApiPropertyOptional({ description: 'Whether a FAQ suggestion was shown at submission time' })
  @IsOptional()
  @IsBoolean()
  faq_matched?: boolean;

  @ApiPropertyOptional({ description: 'ID of the FAQ item that was surfaced, if any' })
  @IsOptional()
  @IsNumber()
  faq_id?: number | null;
}
