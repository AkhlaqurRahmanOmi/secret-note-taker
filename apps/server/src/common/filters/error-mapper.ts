import { ErrorDetail } from '../errors/domain.exception';
import { ErrorCode } from '../errors/error-code';

/** An error ready to be written to the response. */
export interface MappedError {
  status: number;
  code: ErrorCode;
  message: string;
  details?: ErrorDetail[];
}

/** One mapper per error source; the filter tries each in turn. */
export interface ErrorMapper<E = unknown> {
  canMap(error: unknown): error is E;
  map(error: E): MappedError;
}
