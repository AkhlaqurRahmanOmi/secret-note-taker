import type { NextFunction, Request, Response } from 'express';
import { DomainException } from '../errors/domain.exception';
import { ErrorCode } from '../errors/error-code';

/** Errors raised by Express's body parser. */
interface BodyParserError extends Error {
  type: string;
  status: number;
}

const CODES: Readonly<Record<string, ErrorCode>> = {
  'entity.parse.failed': ErrorCode.MALFORMED_JSON,
  'entity.too.large': ErrorCode.PAYLOAD_TOO_LARGE,
  'encoding.unsupported': ErrorCode.UNSUPPORTED_MEDIA_TYPE,
  'charset.unsupported': ErrorCode.UNSUPPORTED_MEDIA_TYPE,
};

function isBodyParserError(error: unknown): error is BodyParserError {
  return (
    error instanceof Error &&
    typeof (error as Partial<BodyParserError>).type === 'string' &&
    typeof (error as Partial<BodyParserError>).status === 'number'
  );
}

/** Maps body-parser failures to precise codes (malformed, too large, wrong type). */
export function bodyParserErrorMiddleware(err: unknown, _req: Request, _res: Response, next: NextFunction): void {
  next(isBodyParserError(err) ? new DomainException(CODES[err.type] ?? ErrorCode.BAD_REQUEST) : err);
}
