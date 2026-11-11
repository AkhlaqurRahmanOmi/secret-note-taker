import { PartialType, PickType } from '@nestjs/swagger';
import { RegisterDto } from '../../auth/dto/register.dto';

/** Name and interests only; `role`, `email` or `password` is a 400. */
export class UpdateUserDto extends PartialType(PickType(RegisterDto, ['name', 'interests'] as const)) {}
