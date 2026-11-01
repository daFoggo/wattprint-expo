import { ApiError } from '@/lib/errors';

// i18n key for the errors a user can fix; null means show the error's own message.
// FastAPI answers `{detail}`: 401 wrong email or password, 400 "Inactive user", 409 email already registered; a 422 keeps
// its validation messages (the forms validate first, so it is rare).
export function authErrorKey(error: unknown): string | null {
  if (!(error instanceof ApiError)) return null;
  if (error.status === 401) return 'auth.errors.invalidCredentials';
  if (error.status === 409) return 'auth.errors.emailTaken';
  if (error.status === 400 && error.detail === 'Inactive user') return 'auth.errors.inactiveUser';
  return null;
}
