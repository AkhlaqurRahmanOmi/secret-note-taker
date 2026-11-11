import { UserView } from '../users/user.view';
import type { AuthResult } from './auth.service';

/** Returned by register and login. */
export class AuthResultView implements AuthResult {
  /** Send as `Authorization: Bearer <token>`. */
  accessToken!: string;
  user!: UserView;
}
