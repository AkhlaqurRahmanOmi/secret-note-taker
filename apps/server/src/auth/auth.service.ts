import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DomainException } from '../common/errors/domain.exception';
import { ErrorCode } from '../common/errors/error-code';
import { PublicUser, toPublicUser } from '../users/public-user';
import { Role } from '../users/role.enum';
import { UsersRepository } from '../users/users.repository';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { PasswordHasher } from './hashing/password-hasher';
import { JwtPayload } from './types/auth-user';

/** Returned by register and login. */
export interface AuthResult {
  accessToken: string;
  user: PublicUser;
}

@Injectable()
export class AuthService {
  /** Compared on unknown emails, so timing doesn't reveal which emails exist. */
  private readonly dummyHash: Promise<string>;

  constructor(
    private readonly users: UsersRepository,
    private readonly hasher: PasswordHasher,
    private readonly jwt: JwtService,
  ) {
    this.dummyHash = hasher.hash(randomUUID());
  }

  /** Always creates a plain user. */
  async register(dto: RegisterDto): Promise<AuthResult> {
    const user = await this.users.createUser({
      name: dto.name,
      email: dto.email,
      password: await this.hasher.hash(dto.password),
      role: Role.User,
      interests: dto.interests ?? [],
    });
    return this.issue(user);
  }

  /** Unknown email and wrong password give the same error in the same time. */
  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.users.findByEmailWithPassword(dto.email);
    const valid = await this.hasher.compare(dto.password, user?.password ?? (await this.dummyHash));
    if (!user || !valid) throw new DomainException(ErrorCode.INVALID_CREDENTIALS);
    return this.issue(toPublicUser(user));
  }

  private async issue(user: PublicUser): Promise<AuthResult> {
    const payload: JwtPayload = { sub: String(user._id), role: user.role };
    return { accessToken: await this.jwt.signAsync(payload), user };
  }
}
