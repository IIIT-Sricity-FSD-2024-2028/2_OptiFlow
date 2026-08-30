import {
  createParamDecorator,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';

export const ActorUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const req = ctx
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | string[] | undefined> }>();
    const raw = req.headers['x-user-id'];
    const v = Array.isArray(raw) ? raw[0] : raw;
    if (v === undefined || v === null || v === '' || v === 'undefined' || v === 'null') {
      return undefined;
    }
    return String(v).trim();
  },
);

export const RequestUserRole = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | string[] | undefined> }>();
    const raw = req.headers['x-user-role'];
    const v = Array.isArray(raw) ? raw[0] : raw;
    return v != null ? String(v).trim() : '';
  },
);
