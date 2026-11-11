import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 100;

/** Absent or empty keeps the default. */
const toNumber = ({ value }: { value: unknown }) => (value === undefined || value === '' ? undefined : Number(value));

/** `?page=&limit=`, defaults 1 / 10. A limit over 100 is capped, not rejected. */
export class PaginationQueryDto {
  @Min(1)
  @IsInt({ message: 'page must be a whole number' })
  @IsOptional()
  @Transform(toNumber)
  page = 1;

  @Min(1)
  @IsInt({ message: 'limit must be a whole number' })
  @IsOptional()
  @Transform(({ value }) => {
    const n = toNumber({ value });
    return n === undefined || Number.isNaN(n) ? n : Math.min(n, MAX_LIMIT);
  })
  limit = DEFAULT_LIMIT;

  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}
