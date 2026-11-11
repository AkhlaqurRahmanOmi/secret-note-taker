import type { ErrorDetail } from '../errors/domain.exception';
import { ErrorCode } from '../errors/error-code';
import type { ErrorResponse } from '../filters/all-exceptions.filter';
import type { PageMeta } from '../pagination/paginated';

// API reference shapes. `implements` keeps each in sync with the real type.

export class PageMetaView implements PageMeta {
  /** The page returned, from 1. */
  page!: number;
  /** Items per page after the cap (at most 100). */
  limit!: number;
  /** Items across all pages. */
  total!: number;
  /** ceil(total / limit); 0 when there are no items. */
  totalPages!: number;
}

export class ErrorDetailView implements ErrorDetail {
  /** The offending field, as a path: `title`, `interests.1`. */
  field!: string;
  message!: string;
}

export class ErrorBodyView implements Required<ErrorResponse['error']> {
  /** The HTTP status, repeated in the body. */
  status!: number;
  /** Stable machine-readable code; branch on this, not on `message`. */
  code!: ErrorCode;
  /** Human-readable, safe to show to users. */
  message!: string;
  /** Per-field problems; present on VALIDATION_FAILED and some conflicts. */
  details!: ErrorDetailView[];
  /** The request path without the query string. */
  path!: string;
  /** ISO 8601. */
  timestamp!: string;
  /** Also sent as the `x-request-id` response header; quote it when reporting a problem. */
  requestId!: string;
}

export class ErrorView implements ErrorResponse {
  error!: ErrorBodyView;
}
