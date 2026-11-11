import { ValidationError } from 'class-validator';
import { DomainException, ErrorDetail } from '../errors/domain.exception';
import { ErrorCode } from '../errors/error-code';

/** Flattens validation errors to `[{ field, message }]` and throws VALIDATION_FAILED. */
export function validationExceptionFactory(errors: ValidationError[]): DomainException {
  return new DomainException(ErrorCode.VALIDATION_FAILED, undefined, flatten(errors));
}

function flatten(errors: ValidationError[], parent = ''): ErrorDetail[] {
  return errors.flatMap((error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    const own = Object.values(error.constraints ?? {}).map((message) => ({ field, message }));
    return [...own, ...flatten(error.children ?? [], field)];
  });
}
