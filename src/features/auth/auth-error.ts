import { ApiError, NetworkError } from '@/lib/errors';

// The `error` object Better Auth's client returns; status 0 means no response arrived.
type BetterAuthError = { status: number; message?: string; code?: string };

// i18n key for the errors a user can fix; null means show the error's own message.
export function authErrorKey(error: unknown): string | null {
  if (!(error instanceof ApiError)) return null;
  if (error.status === 401) return 'auth.errors.invalidCredentials';
  const code = (error.body as { code?: unknown } | null)?.code;
  if (code === 'USER_ALREADY_EXISTS') return 'auth.errors.emailTaken';
  return null;
}

export function toAuthError(error: BetterAuthError): ApiError | NetworkError {
  if (error.status === 0) return new NetworkError(error.message ?? 'Network request failed');
  return new ApiError(error.status, error.message, error);
}
