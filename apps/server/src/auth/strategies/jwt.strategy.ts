import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Env } from '../../config/env.validation';
import { UsersRepository } from '../../users/users.repository';
import { AuthUser, JwtPayload } from '../types/auth-user';

const OBJECT_ID = /^[0-9a-f]{24}$/i;

/**
 * Verifies the bearer token (HS256 only), then reloads the user so deleted users are
 * refused and the current database role is used, not the token's.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService<Env, true>,
    private readonly users: UsersRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('JWT_SECRET', { infer: true }),
      algorithms: ['HS256'],
      ignoreExpiration: false,
    });
  }

  /** null → 401 UNAUTHENTICATED. */
  async validate(payload: Partial<JwtPayload>): Promise<AuthUser | null> {
    if (typeof payload.sub !== 'string' || !OBJECT_ID.test(payload.sub)) return null;
    const user = await this.users.findAuthById(payload.sub);
    return user ? { id: String(user._id), role: user.role } : null;
  }
}
