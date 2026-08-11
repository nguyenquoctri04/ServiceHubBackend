import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No roles restricted
    }
    
    let user: any = null;
    if (context.getType() === 'http') {
      const request = context.switchToHttp().getRequest();
      user = request.user;
    } else if (context.getType() === 'rpc') {
      const rpcData = context.switchToRpc().getData();
      user = rpcData?.currentUser || rpcData?.user;
    }
    
    if (!user || !user.role) {
      throw new ForbiddenException('Access denied. No authenticated user or role found.');
    }
    
    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException(`Access denied. Requires one of roles: ${requiredRoles.join(', ')}`);
    }
    
    return true;
  }
}

