import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ example: 'Mobile App v2' })
  @IsString()
  @IsNotEmpty()
  project_name: string;

  @ApiProperty({ example: 'Next-gen mobile app rollout.', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'team-uuid-123' })
  @IsString()
  @IsNotEmpty()
  teamId: string;

  @ApiProperty({ example: 'Active', required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ example: '2024-11-01', required: false })
  @IsOptional()
  @IsString()
  start_date?: string;

  @ApiProperty({ example: '2025-05-31', required: false })
  @IsOptional()
  @IsString()
  end_date?: string;

  @ApiProperty({ example: 'user-uuid-789' })
  @IsString()
  @IsNotEmpty()
  createdById: string;

  @ApiProperty({ example: 'template-uuid-101', required: false })
  @IsOptional()
  @IsString()
  template_id?: string;
}
