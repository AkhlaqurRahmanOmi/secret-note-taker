import { HttpStatus } from '@nestjs/common';

/** Every API error. Services throw codes; only this table maps them to HTTP statuses. */
export enum ErrorCode {
  // 400
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INVALID_ID = 'INVALID_ID',
  MALFORMED_JSON = 'MALFORMED_JSON',
  BAD_REQUEST = 'BAD_REQUEST',
  // 401
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  // 403
  FORBIDDEN = 'FORBIDDEN',
  CANNOT_DEMOTE_SELF = 'CANNOT_DEMOTE_SELF',
  CANNOT_DELETE_SELF = 'CANNOT_DELETE_SELF',
  // 404
  NOTE_NOT_FOUND = 'NOTE_NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  ROUTE_NOT_FOUND = 'ROUTE_NOT_FOUND',
  // 409
  EMAIL_TAKEN = 'EMAIL_TAKEN',
  CONFLICT = 'CONFLICT',
  // 413, 415, 429
  PAYLOAD_TOO_LARGE = 'PAYLOAD_TOO_LARGE',
  UNSUPPORTED_MEDIA_TYPE = 'UNSUPPORTED_MEDIA_TYPE',
  RATE_LIMITED = 'RATE_LIMITED',
  // 5xx
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

export interface ErrorDefinition {
  status: HttpStatus;
  message: string;
}

export const ERRORS: Readonly<Record<ErrorCode, ErrorDefinition>> = {
  [ErrorCode.VALIDATION_FAILED]: { status: HttpStatus.BAD_REQUEST, message: 'Some fields are invalid.' },
  [ErrorCode.INVALID_ID]: { status: HttpStatus.BAD_REQUEST, message: 'The id in the URL is not a valid id.' },
  [ErrorCode.MALFORMED_JSON]: { status: HttpStatus.BAD_REQUEST, message: 'The request body is not valid JSON.' },
  [ErrorCode.BAD_REQUEST]: { status: HttpStatus.BAD_REQUEST, message: 'The request could not be processed.' },

  [ErrorCode.UNAUTHENTICATED]: { status: HttpStatus.UNAUTHORIZED, message: 'Sign in to continue.' },
  [ErrorCode.TOKEN_EXPIRED]: { status: HttpStatus.UNAUTHORIZED, message: 'Your session has expired. Sign in again.' },
  [ErrorCode.INVALID_CREDENTIALS]: { status: HttpStatus.UNAUTHORIZED, message: 'Email or password is incorrect.' },

  [ErrorCode.FORBIDDEN]: { status: HttpStatus.FORBIDDEN, message: 'You do not have permission to do this.' },
  [ErrorCode.CANNOT_DEMOTE_SELF]: { status: HttpStatus.FORBIDDEN, message: 'You cannot change your own role.' },
  [ErrorCode.CANNOT_DELETE_SELF]: { status: HttpStatus.FORBIDDEN, message: 'You cannot delete your own account.' },

  [ErrorCode.NOTE_NOT_FOUND]: { status: HttpStatus.NOT_FOUND, message: 'Note not found.' },
  [ErrorCode.USER_NOT_FOUND]: { status: HttpStatus.NOT_FOUND, message: 'User not found.' },
  [ErrorCode.ROUTE_NOT_FOUND]: { status: HttpStatus.NOT_FOUND, message: 'There is no endpoint at this path.' },

  [ErrorCode.EMAIL_TAKEN]: { status: HttpStatus.CONFLICT, message: 'An account with this email already exists.' },
  [ErrorCode.CONFLICT]: { status: HttpStatus.CONFLICT, message: 'This conflicts with existing data.' },

  [ErrorCode.PAYLOAD_TOO_LARGE]: { status: HttpStatus.PAYLOAD_TOO_LARGE, message: 'The request body is too large.' },
  [ErrorCode.UNSUPPORTED_MEDIA_TYPE]: {
    status: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
    message: 'Send the request body as application/json.',
  },
  [ErrorCode.RATE_LIMITED]: { status: HttpStatus.TOO_MANY_REQUESTS, message: 'Too many attempts. Try again in a minute.' },

  [ErrorCode.INTERNAL_ERROR]: { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Something went wrong on our side.' },
  [ErrorCode.SERVICE_UNAVAILABLE]: {
    status: HttpStatus.SERVICE_UNAVAILABLE,
    message: 'The service is temporarily unavailable. Try again shortly.',
  },
};

/** For framework errors that carry only a status. */
export function codeForStatus(status: number): ErrorCode {
  switch (status) {
    case HttpStatus.UNAUTHORIZED:
      return ErrorCode.UNAUTHENTICATED;
    case HttpStatus.FORBIDDEN:
      return ErrorCode.FORBIDDEN;
    case HttpStatus.NOT_FOUND:
      return ErrorCode.ROUTE_NOT_FOUND;
    case HttpStatus.CONFLICT:
      return ErrorCode.CONFLICT;
    case HttpStatus.PAYLOAD_TOO_LARGE:
      return ErrorCode.PAYLOAD_TOO_LARGE;
    case HttpStatus.UNSUPPORTED_MEDIA_TYPE:
      return ErrorCode.UNSUPPORTED_MEDIA_TYPE;
    case HttpStatus.TOO_MANY_REQUESTS:
      return ErrorCode.RATE_LIMITED;
    case HttpStatus.SERVICE_UNAVAILABLE:
      return ErrorCode.SERVICE_UNAVAILABLE;
    default:
      return status >= 500 ? ErrorCode.INTERNAL_ERROR : ErrorCode.BAD_REQUEST;
  }
}
