import { DomainException } from '../../errors/domain.exception';
import { ERRORS } from '../../errors/error-code';
import { ErrorMapper, MappedError } from '../error-mapper';

/** Domain errors: status from the ERRORS table. */
export class DomainErrorMapper implements ErrorMapper<DomainException> {
  canMap(error: unknown): error is DomainException {
    return error instanceof DomainException;
  }

  map(error: DomainException): MappedError {
    return {
      status: ERRORS[error.code].status,
      code: error.code,
      message: error.message,
      ...(error.details?.length ? { details: error.details } : {}),
    };
  }
}
