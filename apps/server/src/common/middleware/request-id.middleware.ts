import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';

// Keep a well-formed id from a proxy; replace anything else so client text stays out of logs.
const SAFE_ID = /^[A-Za-z0-9_-]{8,64}$/;

const ids = new WeakMap<Request, string>();

/** Sets x-request-id; also used in error bodies and 5xx logs. */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header(REQUEST_ID_HEADER);
  const id = incoming && SAFE_ID.test(incoming) ? incoming : randomUUID();
  ids.set(req, id);
  res.setHeader(REQUEST_ID_HEADER, id);
  next();
}

export function requestIdOf(req: Request): string {
  return ids.get(req) ?? 'unknown';
}
