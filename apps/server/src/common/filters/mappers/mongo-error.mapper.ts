import { Error as MongooseError, mongo } from 'mongoose';
import { ErrorDetail } from '../../errors/domain.exception';
import { ErrorCode, ERRORS } from '../../errors/error-code';
import { ErrorMapper, MappedError } from '../error-mapper';

type DatabaseError = MongooseError | mongo.MongoError;

const DUPLICATE_KEY = 11000;

/** Mongoose/driver errors. Database messages are never passed through: they can quote data. */
export class MongoErrorMapper implements ErrorMapper<DatabaseError> {
  canMap(error: unknown): error is DatabaseError {
    return error instanceof MongooseError || error instanceof mongo.MongoError;
  }

  map(error: DatabaseError): MappedError {
    if (error instanceof mongo.MongoServerError && error.code === DUPLICATE_KEY) {
      const field = Object.keys(error['keyPattern'] ?? error['keyValue'] ?? {})[0] ?? 'value';
      const code = field === 'email' ? ErrorCode.EMAIL_TAKEN : ErrorCode.CONFLICT;
      return this.mapped(code, [{ field, message: `${field} is already in use` }]);
    }

    if (error instanceof MongooseError.CastError) {
      const code = error.kind === 'ObjectId' ? ErrorCode.INVALID_ID : ErrorCode.BAD_REQUEST;
      return this.mapped(code, [{ field: error.path, message: `${error.path} is not a valid ${error.kind}` }]);
    }

    if (error instanceof MongooseError.ValidationError) {
      const details = Object.values(error.errors).map((e) => ({ field: e.path, message: describe(e) }));
      return this.mapped(ErrorCode.VALIDATION_FAILED, details);
    }

    if (
      error instanceof MongooseError.MongooseServerSelectionError ||
      error instanceof mongo.MongoServerSelectionError ||
      error instanceof mongo.MongoNetworkError
    ) {
      return this.mapped(ErrorCode.SERVICE_UNAVAILABLE);
    }

    return this.mapped(ErrorCode.INTERNAL_ERROR);
  }

  private mapped(code: ErrorCode, details?: ErrorDetail[]): MappedError {
    return { status: ERRORS[code].status, code, message: ERRORS[code].message, ...(details ? { details } : {}) };
  }
}

/** Built from the failed rule, not Mongoose's text, which quotes the value. */
function describe(e: MongooseError.ValidatorError | MongooseError.CastError): string {
  switch (e.kind) {
    case 'required':
      return `${e.path} is required`;
    case 'maxlength':
      return `${e.path} is too long`;
    case 'minlength':
      return `${e.path} is too short`;
    case 'enum':
      return `${e.path} is not an allowed value`;
    default:
      return `${e.path} is invalid`;
  }
}
