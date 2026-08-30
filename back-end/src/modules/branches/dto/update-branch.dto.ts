import { PartialType } from '@nestjs/swagger';
import { CreateBranchDto } from './create-branch.dto';
export class UpdateBranchDto extends PartialType(CreateBranchDto) {}
