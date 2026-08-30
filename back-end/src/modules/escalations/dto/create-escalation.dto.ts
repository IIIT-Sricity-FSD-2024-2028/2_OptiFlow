import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateEscalationDto {
  @ApiProperty({ example: 'comp-uuid-1' })
  @IsString()
  @IsNotEmpty()
  companyId: string;

  @ApiProperty({ example: 'task-uuid-104', required: false })
  @IsOptional()
  @IsString()
  task_id?: string;

  @ApiProperty({ example: 'proj-uuid-2', required: false })
  @IsOptional()
  @IsString()
  project_id?: string;

  @ApiProperty({ example: 'user-uuid-9', required: false })
  @IsOptional()
  @IsString()
  reported_by?: string;

  @ApiProperty({ example: 'user-uuid-8', required: false })
  @IsOptional()
  @IsString()
  target_manager_id?: string;

  @ApiProperty({ example: 'Staging server down' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'Staging has been unreachable for 3 days.',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'System Issue', required: false })
  @IsOptional()
  @IsString()
  blocker_type?: string;

  @ApiProperty({ example: 'Critical', required: false })
  @IsOptional()
  @IsString()
  priority?: any;
}
