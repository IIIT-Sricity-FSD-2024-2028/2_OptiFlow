import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class CreateCommentDto {
  @ApiProperty({ example: 'Task' })
  @IsString()
  @IsNotEmpty()
  entityType: string;
  @ApiProperty() @IsString() @IsNotEmpty() entityId: string;
  @ApiProperty({ example: 'Great work on this!' })
  @IsString()
  @IsNotEmpty()
  commentText: string;
}
