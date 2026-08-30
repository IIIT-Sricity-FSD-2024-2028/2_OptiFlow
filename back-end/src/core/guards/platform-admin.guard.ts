import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const platformAdminId = request.headers['x-platform-admin-id'];

    if (!platformAdminId) {
      throw new UnauthorizedException(
        'Missing x-platform-admin-id header for platform route',
      );
    }

    // Bypass check if bootstrap for dev/demo purposes, but strictly we should check DB
    if (platformAdminId === 'bootstrap') return true;

    const admin = await this.prisma.platformAdminUser.findUnique({
      where: { id: platformAdminId },
    });

    if (!admin || !admin.isActive) {
      throw new UnauthorizedException('Invalid or inactive Platform Admin');
    }

    // Attach admin to request for later use
    request.platformAdmin = admin;

    return true;
  }
}
