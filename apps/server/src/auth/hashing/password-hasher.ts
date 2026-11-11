/** Injection token and contract, so AuthService doesn't import bcrypt. */
export abstract class PasswordHasher {
  abstract hash(plain: string): Promise<string>;

  /** Constant-time. */
  abstract compare(plain: string, hash: string): Promise<boolean>;
}
