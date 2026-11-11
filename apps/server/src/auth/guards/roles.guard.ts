import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DomainException } from '../../common/errors/domain.exception';
import { ErrorCode } from '../../common/errors/error-code';
import { Role } from '../../users/role.enum';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthUser } from '../types/auth-user';

/** Global, after JwtAuthGuard: checks the caller's role. Ownership rules live in services. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;

    // Method-level @Roles replaces the controller's.
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, targets);
    if (!required?.length) return true; // signed in is enough

    const { user } = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    if (!user) throw new DomainException(ErrorCode.UNAUTHENTICATED);
    if (!required.includes(user.role)) throw new DomainException(ErrorCode.FORBIDDEN);
    return true;
  }
}
