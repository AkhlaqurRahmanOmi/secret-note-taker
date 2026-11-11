import { IsEnum, IsOptional } from 'class-validator';
import { Role } from '../role.enum';
import { UpdateUserDto } from './update-user.dto';

/** The only place a role can change. */
export class AdminUpdateUserDto extends UpdateUserDto {
  @IsEnum(Role, { message: `role must be one of: ${Object.values(Role).join(', ')}` })
  @IsOptional()
  role?: Role;
}
