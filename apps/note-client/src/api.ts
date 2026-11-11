// Set at build time; the API is hosted separately.
const API_URL = import.meta.env.VITE_API_URL?.replace(/\/+$/, '');

if (!API_URL) {
  throw new Error('VITE_API_URL is not set. Copy .env.example to .env.');
}

export type Role = 'user' | 'admin';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: Role;
  interests: string[];
  createdAt: string;
}

export interface Note {
  _id: string;
  title: string;
  content: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Page<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

/** The API's error codes. Branch on these, not on messages. */
export type ErrorCode =
  | 'VALIDATION_FAILED'
  | 'INVALID_ID'
  | 'MALFORMED_JSON'
  | 'BAD_REQUEST'
  | 'UNAUTHENTICATED'
  | 'TOKEN_EXPIRED'
  | 'INVALID_CREDENTIALS'
  | 'FORBIDDEN'
  | 'CANNOT_DEMOTE_SELF'
  | 'CANNOT_DELETE_SELF'
  | 'NOTE_NOT_FOUND'
  | 'USER_NOT_FOUND'
  | 'ROUTE_NOT_FOUND'
  | 'EMAIL_TAKEN'
  | 'CONFLICT'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE'
  /** Client-side: the request never reached the API. */
  | 'NETWORK_ERROR';

interface ErrorBody {
  error?: { code?: ErrorCode; message?: string; details?: { field: string; message: string }[]; requestId?: string };
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: ErrorCode,
    message: string,
    public requestId?: string,
  ) {
    super(message);
  }
}

export const TOKEN_KEY = 'token';
export const SESSION_EXPIRED = 'auth:expired';

/** The only codes that sign the user out. */
const SESSION_ENDED: ReadonlySet<ErrorCode> = new Set(['TOKEN_EXPIRED', 'UNAUTHENTICATED']);

/** Parsed body, or throws ApiError. 204 resolves to null. */
async function request(path: string, init: RequestInit): Promise<unknown> {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = new Headers(init.headers);
  if (init.body) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Can’t reach the server. Check your connection and try again.');
  }

  if (res.status === 204) return null;
  const body: unknown = await res.json().catch(() => null);
  if (res.ok) return body;

  const error = (body as ErrorBody | null)?.error;
  const code = error?.code ?? 'INTERNAL_ERROR';
  if (token && SESSION_ENDED.has(code)) window.dispatchEvent(new Event(SESSION_EXPIRED));
  // Prefer the field-level message.
  const message = error?.details?.[0]?.message ?? error?.message ?? `Request failed (${res.status}).`;
  throw new ApiError(res.status, code, message, error?.requestId);
}

/** Unwraps `{ data }`. */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const body = (await request(path, init)) as { data: T } | null;
  return (body?.data ?? null) as T;
}

/** Returns `{ data, meta }` as is. */
export async function apiPage<T>(path: string, init: RequestInit = {}): Promise<Page<T>> {
  return (await request(path, init)) as Page<T>;
}

export const json = (data: unknown) => JSON.stringify(data);
