import { Module } from '@nestjs/common';
import { BcryptPasswordHasher } from './bcrypt-password-hasher';
import { PasswordHasher } from './password-hasher';

/** Shared by AuthModule and UsersModule. */
@Module({
  providers: [{ provide: PasswordHasher, useClass: BcryptPasswordHasher }],
  exports: [PasswordHasher],
})
export class HashingModule {}
