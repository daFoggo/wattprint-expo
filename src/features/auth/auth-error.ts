import { ApiError, NetworkError } from '@/lib/errors';

// The `error` object Better Auth's client returns; status 0 means no response arrived.
type BetterAuthError = { status: number; message?: string; code?: string };

export function toAuthError(error: BetterAuthError): ApiError | NetworkError {
  if (error.status === 0) return new NetworkError(error.message ?? 'Network request failed');
  return new ApiError(error.status, error.message, error);
}
