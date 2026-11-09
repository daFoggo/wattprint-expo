import { ApiError } from '@/lib/errors';

// i18n key for the errors a user can fix; null means show the error's own message.
// Keycloak handles bad credentials in its own login page. FastAPI answers `{detail}` after sign-in:
// 403 "Inactive user", 409 the token's email belongs to another local account.
export function authErrorKey(error: unknown): string | null {
  // The service wraps a failed profile load as `Error(..., { cause: ApiError })`.
  if (error instanceof Error && error.cause instanceof ApiError) error = error.cause;
  if (!(error instanceof ApiError)) return null;
  if (error.status === 409) return 'auth.errors.emailTaken';
  if (error.status === 403 && error.detail === 'Inactive user') return 'auth.errors.inactiveUser';
  return null;
}
