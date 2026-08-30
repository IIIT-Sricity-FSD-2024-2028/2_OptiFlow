import {
  CanActivate,
  ExecutionContext,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class CompanyIdGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const companyId = request.headers['x-company-id'];

    if (!companyId) {
      throw new BadRequestException(
        'Missing x-company-id header for tenant route',
      );
    }

    return true;
  }
}
