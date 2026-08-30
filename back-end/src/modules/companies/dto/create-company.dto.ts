import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export enum CompanyStatus {
  Active = 'Active',
  Suspended = 'Suspended',
  Closed = 'Closed',
}
export class CreateCompanyDto {
  @ApiProperty({ example: 'Acme Corp Pvt Ltd' })
  @IsString()
  @IsNotEmpty()
  legalName: string;
  @ApiProperty({ enum: CompanyStatus, required: false })
  @IsOptional()
  @IsEnum(CompanyStatus)
  status?: CompanyStatus;
}
