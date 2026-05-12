import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) return true;

    const { user } = context.switchToHttp().getRequest();

    if (!user) throw new ForbiddenException('Authentication required');

    const roleHierarchy: Record<UserRole, number> = {
      [UserRole.USER]: 1,
      [UserRole.ADMIN]: 2,
      [UserRole.SUPER_ADMIN]: 3,
    };

    const userLevel = roleHierarchy[user.role as UserRole] ?? 0;
    const minRequired = Math.min(...requiredRoles.map((r) => roleHierarchy[r]));

    if (userLevel < minRequired) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
