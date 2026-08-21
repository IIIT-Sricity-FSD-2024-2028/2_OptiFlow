import { IsOptional, IsString, IsEnum, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSupportRequestDto {
  @ApiPropertyOptional({ enum: ['Open', 'In_Progress', 'Pending_Reply', 'Resolved', 'Closed'] })
  @IsOptional()
  @IsEnum(['Open', 'In_Progress', 'Pending_Reply', 'Resolved', 'Closed'])
  status?: 'Open' | 'In_Progress' | 'Pending_Reply' | 'Resolved' | 'Closed';

  @ApiPropertyOptional({ description: 'ID of the RM team member to assign this ticket to' })
  @IsOptional()
  @IsNumber()
  assignee_id?: number | null;

  @ApiPropertyOptional({ enum: ['Low', 'Medium', 'High', 'Critical'] })
  @IsOptional()
  @IsEnum(['Low', 'Medium', 'High', 'Critical'])
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;
}
