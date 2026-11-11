import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { trimLower } from '../../common/validation/transforms';
import { INTEREST_MAX } from '../schemas/user.schema';

/** `interest` is normalised like stored interests. Pages are pages of groups. */
export class GroupedByInterestsQueryDto extends PaginationQueryDto {
  @MaxLength(INTEREST_MAX)
  @IsNotEmpty({ message: 'interest must not be empty' })
  @IsString()
  @IsOptional()
  @Transform(trimLower)
  interest?: string;
}
