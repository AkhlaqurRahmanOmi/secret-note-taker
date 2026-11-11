import { IsEnum, IsOptional } from 'class-validator';
import { RegisterDto } from '../../auth/dto/register.dto';
import { Role } from '../role.enum';

/** Register's fields plus an optional role. */
export class CreateUserDto extends RegisterDto {
  @IsEnum(Role, { message: `role must be one of: ${Object.values(Role).join(', ')}` })
  @IsOptional()
  role?: Role;
}
