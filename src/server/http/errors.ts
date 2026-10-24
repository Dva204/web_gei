import 'server-only';

export type ApiErrorCode =
  | 'INVALID_REQUEST'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'SERVICE_UNAVAILABLE'
  | 'INTERNAL_ERROR';

const statusByCode: Record<ApiErrorCode, number> = {
  INVALID_REQUEST: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  SERVICE_UNAVAILABLE: 503,
  INTERNAL_ERROR: 500,
};

// Only pass messages written by the application, never raw database/provider errors.
export class ApiError extends Error {
  readonly status: number;
  constructor(readonly code: ApiErrorCode, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = statusByCode[code];
  }
}

export function publicError(error: unknown) {
  if (error instanceof ApiError) return error;
  return new ApiError('INTERNAL_ERROR', 'Không thể xử lý yêu cầu. Vui lòng thử lại.');
}
