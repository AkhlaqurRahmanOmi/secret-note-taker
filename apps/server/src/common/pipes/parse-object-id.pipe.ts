import { Injectable, PipeTransform } from '@nestjs/common';
import { DomainException } from '../errors/domain.exception';
import { ErrorCode } from '../errors/error-code';

// Stricter than ObjectId.isValid(), which accepts any 12-character string.
const OBJECT_ID = /^[0-9a-f]{24}$/i;

/** A malformed `:id` is a 400 INVALID_ID before any query runs. */
@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!OBJECT_ID.test(value)) throw new DomainException(ErrorCode.INVALID_ID);
    return value;
  }
}
