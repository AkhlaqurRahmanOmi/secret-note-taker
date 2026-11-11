import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from '../types/auth-user';

/** The caller, or one field of it: `@CurrentUser('id')`. */
export const CurrentUser = createParamDecorator((field: keyof AuthUser | undefined, ctx: ExecutionContext) => {
  const { user } = ctx.switchToHttp().getRequest<{ user?: AuthUser }>();
  return field ? user?.[field] : user;
});
