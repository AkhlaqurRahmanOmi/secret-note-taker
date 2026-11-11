import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { trimLower } from '../../common/validation/transforms';
import { USER_EMAIL_MAX } from '../../users/schemas/user.schema';

/** Loose on purpose: bad input fails as INVALID_CREDENTIALS, not a revealing 400. */
export class LoginDto {
  @MaxLength(USER_EMAIL_MAX)
  @IsNotEmpty({ message: 'email is required' })
  @IsString()
  @Transform(trimLower)
  email!: string;

  @MaxLength(256)
  @IsNotEmpty({ message: 'password is required' })
  @IsString()
  password!: string;
}
