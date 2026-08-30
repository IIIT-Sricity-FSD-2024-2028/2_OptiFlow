import {
  createParamDecorator,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';

export const PlatformAdminId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const adminId = request.headers['x-platform-admin-id'];

    if (!adminId) {
      throw new BadRequestException('x-platform-admin-id header is missing');
    }

    return adminId as string; // Sticking to string as UUIDs are strings in schema
  },
);
