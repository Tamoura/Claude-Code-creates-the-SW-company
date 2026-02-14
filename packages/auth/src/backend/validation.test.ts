import {
  signupSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  validateBody,
} from './validation';

describe('Validation Schemas', () => {
  describe('signupSchema', () => {
    it('valid signup data passes validation', () => {
      const data = { email: 'user@example.com', password: 'securePass123' };
      const result = signupSchema.parse(data);
      expect(result).toEqual(data);
    });

    it('rejects weak passwords (less than 8 characters)', () => {
      const data = { email: 'user@example.com', password: 'short' };
      expect(() => signupSchema.parse(data)).toThrow('Password must be at least 8 characters');
    });

    it('rejects passwords exceeding 128 characters', () => {
      const data = { email: 'user@example.com', password: 'a'.repeat(129) };
      expect(() => signupSchema.parse(data)).toThrow('Password must be at most 128 characters');
    });

    it('rejects invalid email', () => {
      const data = { email: 'not-an-email', password: 'securePass123' };
      expect(() => signupSchema.parse(data)).toThrow('Invalid email address');
    });

    it('rejects missing email', () => {
      const data = { password: 'securePass123' };
      expect(() => signupSchema.parse(data)).toThrow();
    });

    it('rejects missing password', () => {
      const data = { email: 'user@example.com' };
      expect(() => signupSchema.parse(data)).toThrow();
    });
  });

  describe('loginSchema', () => {
    it('valid login data passes validation', () => {
      const data = { email: 'user@example.com', password: 'myPassword' };
      const result = loginSchema.parse(data);
      expect(result).toEqual(data);
    });

    it('rejects empty email', () => {
      const data = { email: '', password: 'myPassword' };
      expect(() => loginSchema.parse(data)).toThrow();
    });

    it('rejects invalid email format', () => {
      const data = { email: 'bad-email', password: 'myPassword' };
      expect(() => loginSchema.parse(data)).toThrow('Invalid email address');
    });

    it('rejects empty password', () => {
      const data = { email: 'user@example.com', password: '' };
      expect(() => loginSchema.parse(data)).toThrow('Password is required');
    });
  });

  describe('refreshSchema', () => {
    it('valid refresh token passes validation', () => {
      const data = { refresh_token: 'some-refresh-token-value' };
      const result = refreshSchema.parse(data);
      expect(result).toEqual(data);
    });

    it('rejects empty refresh token', () => {
      const data = { refresh_token: '' };
      expect(() => refreshSchema.parse(data)).toThrow('Refresh token is required');
    });

    it('rejects missing refresh token', () => {
      const data = {};
      expect(() => refreshSchema.parse(data)).toThrow();
    });
  });

  describe('logoutSchema', () => {
    it('valid logout data passes validation', () => {
      const data = { refresh_token: 'some-refresh-token-value' };
      const result = logoutSchema.parse(data);
      expect(result).toEqual(data);
    });

    it('rejects empty refresh token', () => {
      const data = { refresh_token: '' };
      expect(() => logoutSchema.parse(data)).toThrow('Refresh token is required');
    });

    it('rejects missing refresh token', () => {
      const data = {};
      expect(() => logoutSchema.parse(data)).toThrow();
    });
  });

  describe('forgotPasswordSchema', () => {
    it('valid email passes validation', () => {
      const data = { email: 'user@example.com' };
      const result = forgotPasswordSchema.parse(data);
      expect(result).toEqual(data);
    });

    it('rejects invalid email', () => {
      const data = { email: 'not-valid' };
      expect(() => forgotPasswordSchema.parse(data)).toThrow('Invalid email address');
    });

    it('rejects empty email', () => {
      const data = { email: '' };
      expect(() => forgotPasswordSchema.parse(data)).toThrow();
    });
  });

  describe('resetPasswordSchema', () => {
    it('valid reset data passes validation', () => {
      const data = { token: 'reset-token-abc', newPassword: 'newSecurePass1' };
      const result = resetPasswordSchema.parse(data);
      expect(result).toEqual(data);
    });

    it('rejects empty reset token', () => {
      const data = { token: '', newPassword: 'newSecurePass1' };
      expect(() => resetPasswordSchema.parse(data)).toThrow('Reset token is required');
    });

    it('rejects weak new password', () => {
      const data = { token: 'reset-token-abc', newPassword: 'short' };
      expect(() => resetPasswordSchema.parse(data)).toThrow('Password must be at least 8 characters');
    });

    it('rejects new password exceeding 128 characters', () => {
      const data = { token: 'reset-token-abc', newPassword: 'a'.repeat(129) };
      expect(() => resetPasswordSchema.parse(data)).toThrow('Password must be at most 128 characters');
    });
  });

  describe('changePasswordSchema', () => {
    it('valid change password data passes validation', () => {
      const data = { current_password: 'oldPass123', new_password: 'newPass456' };
      const result = changePasswordSchema.parse(data);
      expect(result).toEqual(data);
    });

    it('rejects empty current password', () => {
      const data = { current_password: '', new_password: 'newPass456' };
      expect(() => changePasswordSchema.parse(data)).toThrow('Current password is required');
    });

    it('rejects weak new password', () => {
      const data = { current_password: 'oldPass123', new_password: 'short' };
      expect(() => changePasswordSchema.parse(data)).toThrow('Password must be at least 8 characters');
    });

    it('rejects new password exceeding 128 characters', () => {
      const data = { current_password: 'oldPass123', new_password: 'a'.repeat(129) };
      expect(() => changePasswordSchema.parse(data)).toThrow('Password must be at most 128 characters');
    });
  });

  describe('validateBody', () => {
    it('returns parsed data for valid input', () => {
      const data = { email: 'user@example.com', password: 'securePass123' };
      const result = validateBody(signupSchema, data);
      expect(result).toEqual(data);
    });

    it('throws ZodError for invalid input', () => {
      const data = { email: 'bad', password: 'x' };
      expect(() => validateBody(signupSchema, data)).toThrow();
    });
  });
});
