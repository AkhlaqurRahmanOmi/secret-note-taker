import { HttpException } from '@nestjs/common';
import { codeForStatus, ERRORS } from '../../errors/error-code';
import { ErrorMapper, MappedError } from '../error-mapper';

/** Framework HttpExceptions, mapped by status. Their messages can echo input, so ours replace them. */
export class HttpErrorMapper implements ErrorMapper<HttpException> {
  canMap(error: unknown): error is HttpException {
    return error instanceof HttpException;
  }

  map(error: HttpException): MappedError {
    const status = error.getStatus();
    const code = codeForStatus(status);
    return { status, code, message: ERRORS[code].message };
  }
}
