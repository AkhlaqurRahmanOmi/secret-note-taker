import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { DomainException } from '../../common/errors/domain.exception';
import { ErrorCode } from '../../common/errors/error-code';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthUser } from '../types/auth-user';

/** Global; runs before RolesGuard. Every route needs a token unless @Public(). */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  override canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    return isPublic || super.canActivate(context);
  }

  /**
   * Real errors (e.g. database down) are rethrown, not turned into a 401. Expired tokens get
   * TOKEN_EXPIRED; everything else is UNAUTHENTICATED.
   */
  override handleRequest<TUser = AuthUser>(err: unknown, user: TUser | false, info?: { name?: string }): TUser {
    if (err) throw err;
    if (info?.name === 'TokenExpiredError') throw new DomainException(ErrorCode.TOKEN_EXPIRED);
    if (!user) throw new DomainException(ErrorCode.UNAUTHENTICATED);
    return user;
  }
}
