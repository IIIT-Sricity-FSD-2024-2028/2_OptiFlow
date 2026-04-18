import { SetMetadata } from '@nestjs/common';

// This creates a custom @Roles() decorator
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);