import { ApiError } from '@/lib/errors';

import { authErrorKey } from './auth-error';

describe('authErrorKey', () => {
  it('maps wrong credentials (401) to the invalid-credentials key', () => {
    expect(authErrorKey(new ApiError(401, 'Incorrect email or password', {}))).toBe(
      'auth.errors.invalidCredentials',
    );
  });

  it('maps an already registered email (409) to the email-taken key', () => {
    expect(authErrorKey(new ApiError(409, 'Email already registered', {}))).toBe(
      'auth.errors.emailTaken',
    );
  });

  it('has no key for a 422 validation error, so the caller shows its message', () => {
    expect(
      authErrorKey(new ApiError(422, [{ msg: 'value is not a valid email address' }], {})),
    ).toBeNull();
  });

  it('has no key for other errors, so the caller shows the raw message', () => {
    expect(authErrorKey(new ApiError(500, 'boom', {}))).toBeNull();
    expect(authErrorKey(new Error('x'))).toBeNull();
  });
});
