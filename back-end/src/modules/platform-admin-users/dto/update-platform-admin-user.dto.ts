import { PartialType } from '@nestjs/swagger';
import { CreatePlatformAdminUserDto } from './create-platform-admin-user.dto';
export class UpdatePlatformAdminUserDto extends PartialType(
  CreatePlatformAdminUserDto,
) {}
