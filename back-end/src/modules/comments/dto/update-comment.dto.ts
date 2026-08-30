import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class UpdateCommentDto {
  @ApiProperty() @IsString() @IsNotEmpty() commentText: string;
}
