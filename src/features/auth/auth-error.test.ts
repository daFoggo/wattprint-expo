import { ApiError, NetworkError } from '@/lib/errors';

import { authErrorKey, toAuthError } from './auth-error';

describe('toAuthError', () => {
  it('turns a Better Auth rejection into an ApiError with its message', () => {
    const error = toAuthError({ status: 401, message: 'Invalid email or password' });
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 401, message: 'Invalid email or password' });
  });

  it('keeps the error code in the body', () => {
    const error = toAuthError({ status: 422, code: 'USER_ALREADY_EXISTS', message: 'taken' });
    expect((error as ApiError).body).toMatchObject({ code: 'USER_ALREADY_EXISTS' });
  });

  it('falls back to the HTTP status text when there is no message', () => {
    expect(toAuthError({ status: 500 }).message).toBe('HTTP 500');
  });

  it('treats status 0 (no response) as a NetworkError', () => {
    expect(toAuthError({ status: 0, message: 'Failed to fetch' })).toBeInstanceOf(NetworkError);
  });
});

describe('authErrorKey', () => {
  it('maps wrong credentials to the invalid-credentials key', () => {
    expect(authErrorKey(new ApiError(401, 'Invalid email or password', {}))).toBe(
      'auth.errors.invalidCredentials',
    );
  });

  it('maps an already-used email to the email-taken key', () => {
    const body = { status: 422, code: 'USER_ALREADY_EXISTS' };
    expect(authErrorKey(new ApiError(422, 'User already exists', body))).toBe(
      'auth.errors.emailTaken',
    );
  });

  it('has no key for other errors, so the caller shows the raw message', () => {
    expect(authErrorKey(new ApiError(500, 'boom', {}))).toBeNull();
    expect(authErrorKey(new Error('x'))).toBeNull();
  });
});
