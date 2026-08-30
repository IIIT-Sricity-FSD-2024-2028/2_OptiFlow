import {
  createParamDecorator,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';

export const CompanyId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const companyId =
      (request.headers['x-company-id'] as string) || request.user?.companyId;

    if (!companyId) {
      throw new BadRequestException('x-company-id header is missing');
    }

    return companyId as string;
  },
);
