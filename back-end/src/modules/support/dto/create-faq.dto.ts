import { IsString, IsNotEmpty, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFaqDto {
  @ApiProperty({ example: 'Access Issue', description: 'FAQ category (must match support categories)' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ example: 'How do I request access to a new system?' })
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiProperty({ example: 'Submit a request via the IT Portal under Access Management...' })
  @IsString()
  @IsNotEmpty()
  answer: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  is_active?: boolean = true;
}
