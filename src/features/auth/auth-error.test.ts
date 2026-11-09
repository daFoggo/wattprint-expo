import { ApiError } from '@/lib/errors';

import { authErrorKey } from './auth-error';

describe('authErrorKey', () => {
  it('maps an email owned by another account (409) to the email-taken key', () => {
    expect(authErrorKey(new ApiError(409, 'Email belongs to another account', {}))).toBe(
      'auth.errors.emailTaken',
    );
  });

  it('maps the backend inactive-user answer (403) to the inactive-user key', () => {
    expect(authErrorKey(new ApiError(403, 'Inactive user', {}))).toBe('auth.errors.inactiveUser');
  });

  it('reads the ApiError wrapped as the cause of a failed profile load', () => {
    const wrapped = new Error('Could not load the signed-in user (HTTP 409)', {
      cause: new ApiError(409, 'Email belongs to another account', {}),
    });
    expect(authErrorKey(wrapped)).toBe('auth.errors.emailTaken');
  });

  it('has no key for other 403s or other errors, so the caller shows the raw message', () => {
    expect(authErrorKey(new ApiError(403, 'Admin role required', {}))).toBeNull();
    expect(authErrorKey(new ApiError(500, 'boom', {}))).toBeNull();
    expect(authErrorKey(new Error('x'))).toBeNull();
  });
});
