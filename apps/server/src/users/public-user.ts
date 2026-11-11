import { Stored } from '../common/database/base.repository';
import { User } from './schemas/user.schema';

/** A user without the password hash. */
export type PublicUser = Omit<Stored<User>, 'password'>;

/** Login only: the one read that loads the hash. */
export function toPublicUser(user: Stored<User>): PublicUser {
  const copy: Partial<Stored<User>> = { ...user };
  delete copy.password;
  return copy as PublicUser;
}
