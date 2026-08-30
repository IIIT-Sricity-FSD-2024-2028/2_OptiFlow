import { IsString, IsNotEmpty, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class CreateAttachmentDto {
  @ApiProperty({ example: 'Task' })
  @IsString()
  @IsNotEmpty()
  entityType: string;
  @ApiProperty() @IsString() @IsNotEmpty() entityId: string;
  @ApiProperty() @IsString() @IsNotEmpty() fileName: string;
  @ApiProperty() @IsString() @IsNotEmpty() fileType: string;
  @ApiProperty() @IsInt() fileSizeBytes: number;
  @ApiProperty() @IsString() @IsNotEmpty() fileUrl: string;
}
