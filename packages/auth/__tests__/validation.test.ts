import {
  signupSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  validateBody,
} from '../src/backend/validation';
import { ZodError } from 'zod';

describe('signupSchema', () => {
  it('validates a valid signup payload', () => {
    const result = signupSchema.parse({ email: 'user@example.com', password: 'Password123!' });
    expect(result.email).toBe('user@example.com');
  });

  it('rejects invalid email', () => {
    expect(() => signupSchema.parse({ email: 'not-an-email', password: 'Password123!' })).toThrow(ZodError);
  });

  it('rejects password shorter than 8 characters', () => {
    expect(() => signupSchema.parse({ email: 'user@example.com', password: 'short' })).toThrow(ZodError);
  });

  it('rejects password longer than 128 characters', () => {
    const longPassword = 'a'.repeat(129);
    expect(() => signupSchema.parse({ email: 'user@example.com', password: longPassword })).toThrow(ZodError);
  });

  it('accepts password of exactly 8 characters', () => {
    expect(() => signupSchema.parse({ email: 'user@example.com', password: '12345678' })).not.toThrow();
  });

  it('accepts password of exactly 128 characters', () => {
    const exactPassword = 'a'.repeat(128);
    expect(() => signupSchema.parse({ email: 'user@example.com', password: exactPassword })).not.toThrow();
  });
});

describe('loginSchema', () => {
  it('validates a valid login payload', () => {
    const result = loginSchema.parse({ email: 'user@example.com', password: 'any' });
    expect(result.email).toBe('user@example.com');
  });

  it('rejects empty password', () => {
    expect(() => loginSchema.parse({ email: 'user@example.com', password: '' })).toThrow(ZodError);
  });
});

describe('refreshSchema', () => {
  it('validates a valid refresh token', () => {
    const result = refreshSchema.parse({ refresh_token: 'some-token' });
    expect(result.refresh_token).toBe('some-token');
  });

  it('rejects empty refresh token', () => {
    expect(() => refreshSchema.parse({ refresh_token: '' })).toThrow(ZodError);
  });
});

describe('forgotPasswordSchema', () => {
  it('validates a valid email', () => {
    const result = forgotPasswordSchema.parse({ email: 'user@example.com' });
    expect(result.email).toBe('user@example.com');
  });

  it('rejects invalid email', () => {
    expect(() => forgotPasswordSchema.parse({ email: 'bad-email' })).toThrow(ZodError);
  });
});

describe('resetPasswordSchema', () => {
  it('validates a valid reset payload', () => {
    const result = resetPasswordSchema.parse({ token: 'reset-token', newPassword: 'NewPassword123!' });
    expect(result.token).toBe('reset-token');
    expect(result.newPassword).toBe('NewPassword123!');
  });

  it('rejects empty token', () => {
    expect(() => resetPasswordSchema.parse({ token: '', newPassword: 'NewPassword123!' })).toThrow(ZodError);
  });

  it('rejects weak new password', () => {
    expect(() => resetPasswordSchema.parse({ token: 'valid', newPassword: 'short' })).toThrow(ZodError);
  });
});

describe('changePasswordSchema', () => {
  it('validates a valid change password payload', () => {
    const result = changePasswordSchema.parse({
      current_password: 'OldPassword123!',
      new_password: 'NewPassword456!',
    });
    expect(result.current_password).toBe('OldPassword123!');
  });
});

describe('validateBody', () => {
  it('parses valid data with schema', () => {
    const result = validateBody(loginSchema, { email: 'user@example.com', password: 'pass' });
    expect(result.email).toBe('user@example.com');
  });

  it('throws ZodError for invalid data', () => {
    expect(() => validateBody(signupSchema, { email: 'bad', password: '123' })).toThrow(ZodError);
  });
});
