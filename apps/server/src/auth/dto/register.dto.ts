import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsByteLength,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { normaliseList, trim, trimLower } from '../../common/validation/transforms';
import { INTEREST_MAX, USER_EMAIL_MAX, USER_NAME_MAX } from '../../users/schemas/user.schema';

export const PASSWORD_MIN = 8;
/** bcrypt ignores bytes past 72, so longer passwords are refused. */
export const PASSWORD_MAX_BYTES = 72;
export const INTERESTS_MAX = 20;

/** No `role` field: sending one is a 400. Validators run bottom-up, basic checks last. */
export class RegisterDto {
  @MaxLength(USER_NAME_MAX)
  @IsNotEmpty({ message: 'name is required' })
  @IsString()
  @Transform(trim)
  name!: string;

  @MaxLength(USER_EMAIL_MAX)
  @IsEmail({}, { message: 'email must be a valid email address' })
  @IsString()
  @Transform(trimLower)
  email!: string;

  @IsByteLength(0, PASSWORD_MAX_BYTES, { message: `password must be at most ${PASSWORD_MAX_BYTES} bytes` })
  @MinLength(PASSWORD_MIN, { message: `password must be at least ${PASSWORD_MIN} characters` })
  @IsString()
  password!: string;

  @MaxLength(INTEREST_MAX, { each: true })
  @IsNotEmpty({ each: true, message: 'interests must not contain empty values' })
  @IsString({ each: true })
  @ArrayMaxSize(INTERESTS_MAX)
  @IsArray()
  @IsOptional()
  @Transform(normaliseList)
  interests?: string[];
}
