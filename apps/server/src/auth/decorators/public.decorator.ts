import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Skips the global auth guards. Without it, a route needs a token. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
