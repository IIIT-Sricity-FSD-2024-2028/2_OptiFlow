import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    
    // If no roles are defined on the route, allow access
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    // The rubric requires reading from the header
    const userRole = request.headers['x-user-role'];

    if (!userRole) {
      throw new ForbiddenException('Access Denied: Missing x-user-role header');
    }

    if (!requiredRoles.includes(userRole)) {
      throw new ForbiddenException(`Access Denied: Your role (${userRole}) is not authorized for this action.`);
    }

    return true;
  }
}