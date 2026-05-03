import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';

export const ActorUserId = createParamDecorator((_data: unknown, ctx: ExecutionContext): number => {
  const req = ctx.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined> }>();
  const raw = req.headers['x-user-id'];
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === undefined || v === '') {
    throw new BadRequestException('x-user-id header is required for this operation');
  }
  const n = parseInt(String(v).trim(), 10);
  if (!Number.isInteger(n) || n < 1) {
    throw new BadRequestException('x-user-id must be a positive integer');
  }
  return n;
});

export const RequestUserRole = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const req = ctx.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined> }>();
  const raw = req.headers['x-user-role'];
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v != null ? String(v).trim() : '';
});
