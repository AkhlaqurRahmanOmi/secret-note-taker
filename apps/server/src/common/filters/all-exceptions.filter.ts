import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ErrorDetail } from '../errors/domain.exception';
import { ErrorCode, ERRORS } from '../errors/error-code';
import { requestIdOf } from '../middleware/request-id.middleware';
import { ErrorMapper, MappedError } from './error-mapper';

/** The API's only error shape. */
export interface ErrorResponse {
  error: {
    status: number;
    code: ErrorCode;
    message: string;
    details?: ErrorDetail[];
    path: string;
    timestamp: string;
    requestId: string;
  };
}

const UNKNOWN: MappedError = {
  status: ERRORS[ErrorCode.INTERNAL_ERROR].status,
  code: ErrorCode.INTERNAL_ERROR,
  message: ERRORS[ErrorCode.INTERNAL_ERROR].message,
};

/**
 * The first mapper that recognises an error decides the response; anything else is a 500.
 * 5xx are logged with the request id; clients never see internals.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  constructor(private readonly mappers: readonly ErrorMapper[]) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const mapped = this.map(exception);
    const path = req.originalUrl.split('?')[0]; // the query string may carry user input
    const requestId = requestIdOf(req);

    if (mapped.status >= 500) {
      this.logger.error(
        `${req.method} ${path} -> ${mapped.status} ${mapped.code} [${requestId}]`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    if (res.headersSent) return;

    const body: ErrorResponse = {
      error: {
        status: mapped.status,
        code: mapped.code,
        message: mapped.message,
        ...(mapped.details?.length ? { details: mapped.details } : {}),
        path,
        timestamp: new Date().toISOString(),
        requestId,
      },
    };
    res.status(mapped.status).json(body);
  }

  private map(exception: unknown): MappedError {
    for (const mapper of this.mappers) {
      if (mapper.canMap(exception)) return mapper.map(exception);
    }
    return UNKNOWN;
  }
}
