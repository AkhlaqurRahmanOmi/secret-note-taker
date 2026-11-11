import { ErrorCode, ERRORS } from './error-code';

/** One field-level problem. */
export interface ErrorDetail {
  field: string;
  message: string;
}

/** Thrown by services with a code; the filter maps it to a status via ERRORS. */
export class DomainException extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string = ERRORS[code].message,
    readonly details?: ErrorDetail[],
  ) {
    super(message);
    this.name = 'DomainException';
  }
}
