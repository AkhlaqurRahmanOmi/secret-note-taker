import { Role } from '../../users/role.enum';

/** Token payload; `role` is informational only. */
export interface JwtPayload {
  sub: string;
  role: Role;
}

/** `req.user`. The role is read from the database on every request. */
export interface AuthUser {
  id: string;
  role: Role;
}
