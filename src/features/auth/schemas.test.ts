import { signInSchema, signUpSchema } from './schemas';

describe('auth schemas', () => {
  const valid = { email: 'a@example.com', password: 'password123' };

  it('accepts valid sign-in input', () => {
    expect(signInSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a malformed email with the email message key', () => {
    const result = signInSchema.safeParse({ ...valid, email: 'nope' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('auth.validation.emailInvalid');
  });

  it('rejects a password shorter than 8 characters', () => {
    const result = signInSchema.safeParse({ ...valid, password: '1234567' });
    expect(result.error?.issues[0]?.message).toBe('auth.validation.passwordShort');
  });

  it('requires a name on sign-up', () => {
    const result = signUpSchema.safeParse({ ...valid, name: '' });
    expect(result.error?.issues[0]?.message).toBe('auth.validation.nameRequired');
  });

  it('caps the name at 64 characters', () => {
    expect(signUpSchema.safeParse({ ...valid, name: 'x'.repeat(65) }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...valid, name: 'x'.repeat(64) }).success).toBe(true);
  });
});
