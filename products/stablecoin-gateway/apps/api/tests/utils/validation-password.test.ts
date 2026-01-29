import { signupSchema } from '../../src/utils/validation';

describe('Password Validation - Security Policy', () => {
  describe('Password length requirement', () => {
    it('should reject password with 11 characters', () => {
      const payload = {
        email: 'test@example.com',
        password: 'Abc123!@#$%',
      };

      expect(() => signupSchema.parse(payload)).toThrow();
    });

    it('should accept password with exactly 12 characters', () => {
      const payload = {
        email: 'test@example.com',
        password: 'Abc123!@#$%^',
      };

      const result = signupSchema.parse(payload);
      expect(result.password).toBe('Abc123!@#$%^');
    });

    it('should accept password with more than 12 characters', () => {
      const payload = {
        email: 'test@example.com',
        password: 'Abc123!@#$%^&*()',
      };

      const result = signupSchema.parse(payload);
      expect(result.password).toBe('Abc123!@#$%^&*()');
    });
  });

  describe('Uppercase letter requirement', () => {
    it('should reject password without uppercase letter', () => {
      const payload = {
        email: 'test@example.com',
        password: 'abc123!@#$%^',
      };

      expect(() => signupSchema.parse(payload)).toThrow(/uppercase/i);
    });

    it('should accept password with uppercase letter', () => {
      const payload = {
        email: 'test@example.com',
        password: 'Abc123!@#$%^',
      };

      const result = signupSchema.parse(payload);
      expect(result.password).toBe('Abc123!@#$%^');
    });
  });

  describe('Lowercase letter requirement', () => {
    it('should reject password without lowercase letter', () => {
      const payload = {
        email: 'test@example.com',
        password: 'ABC123!@#$%^',
      };

      expect(() => signupSchema.parse(payload)).toThrow(/lowercase/i);
    });

    it('should accept password with lowercase letter', () => {
      const payload = {
        email: 'test@example.com',
        password: 'Abc123!@#$%^',
      };

      const result = signupSchema.parse(payload);
      expect(result.password).toBe('Abc123!@#$%^');
    });
  });

  describe('Number requirement', () => {
    it('should reject password without number', () => {
      const payload = {
        email: 'test@example.com',
        password: 'Abcdefg!@#$%',
      };

      expect(() => signupSchema.parse(payload)).toThrow(/number/i);
    });

    it('should accept password with number', () => {
      const payload = {
        email: 'test@example.com',
        password: 'Abc123!@#$%^',
      };

      const result = signupSchema.parse(payload);
      expect(result.password).toBe('Abc123!@#$%^');
    });
  });

  describe('Special character requirement', () => {
    it('should reject password without special character', () => {
      const payload = {
        email: 'test@example.com',
        password: 'Abc123456789',
      };

      expect(() => signupSchema.parse(payload)).toThrow(/special character/i);
    });

    it('should accept password with exclamation mark (!)', () => {
      const payload = {
        email: 'test@example.com',
        password: 'Abc123456789!',
      };

      const result = signupSchema.parse(payload);
      expect(result.password).toBe('Abc123456789!');
    });

    it('should accept password with at symbol (@)', () => {
      const payload = {
        email: 'test@example.com',
        password: 'Abc123456789@',
      };

      const result = signupSchema.parse(payload);
      expect(result.password).toBe('Abc123456789@');
    });

    it('should accept password with hash (#)', () => {
      const payload = {
        email: 'test@example.com',
        password: 'Abc123456789#',
      };

      const result = signupSchema.parse(payload);
      expect(result.password).toBe('Abc123456789#');
    });

    it('should accept password with dollar sign ($)', () => {
      const payload = {
        email: 'test@example.com',
        password: 'Abc123456789$',
      };

      const result = signupSchema.parse(payload);
      expect(result.password).toBe('Abc123456789$');
    });

    it('should accept password with percent (%)', () => {
      const payload = {
        email: 'test@example.com',
        password: 'Abc123456789%',
      };

      const result = signupSchema.parse(payload);
      expect(result.password).toBe('Abc123456789%');
    });
  });

  describe('Combined requirements', () => {
    it('should reject password missing only uppercase', () => {
      const payload = {
        email: 'test@example.com',
        password: 'abc123!@#$%^',
      };

      expect(() => signupSchema.parse(payload)).toThrow(/uppercase/i);
    });

    it('should reject password missing only lowercase', () => {
      const payload = {
        email: 'test@example.com',
        password: 'ABC123!@#$%^',
      };

      expect(() => signupSchema.parse(payload)).toThrow(/lowercase/i);
    });

    it('should reject password missing only number', () => {
      const payload = {
        email: 'test@example.com',
        password: 'Abcdefg!@#$%',
      };

      expect(() => signupSchema.parse(payload)).toThrow(/number/i);
    });

    it('should reject password missing only special character', () => {
      const payload = {
        email: 'test@example.com',
        password: 'Abc123456789',
      };

      expect(() => signupSchema.parse(payload)).toThrow(/special character/i);
    });

    it('should accept password with all requirements met', () => {
      const payload = {
        email: 'test@example.com',
        password: 'MySecure123!',
      };

      const result = signupSchema.parse(payload);
      expect(result.email).toBe('test@example.com');
      expect(result.password).toBe('MySecure123!');
    });
  });

  describe('Error messages', () => {
    it('should provide helpful error for length', () => {
      const payload = {
        email: 'test@example.com',
        password: 'Short1!',
      };

      try {
        signupSchema.parse(payload);
        fail('Should have thrown validation error');
      } catch (error: any) {
        expect(error.issues[0].message).toContain('12 characters');
      }
    });

    it('should provide helpful error for missing uppercase', () => {
      const payload = {
        email: 'test@example.com',
        password: 'nocapitals123!',
      };

      try {
        signupSchema.parse(payload);
        fail('Should have thrown validation error');
      } catch (error: any) {
        const uppercaseError = error.issues.find((issue: any) =>
          issue.message.toLowerCase().includes('uppercase')
        );
        expect(uppercaseError).toBeDefined();
      }
    });

    it('should provide helpful error for missing lowercase', () => {
      const payload = {
        email: 'test@example.com',
        password: 'ALLCAPS123!@',
      };

      try {
        signupSchema.parse(payload);
        fail('Should have thrown validation error');
      } catch (error: any) {
        const lowercaseError = error.issues.find((issue: any) =>
          issue.message.toLowerCase().includes('lowercase')
        );
        expect(lowercaseError).toBeDefined();
      }
    });

    it('should provide helpful error for missing number', () => {
      const payload = {
        email: 'test@example.com',
        password: 'NoNumbers!@#',
      };

      try {
        signupSchema.parse(payload);
        fail('Should have thrown validation error');
      } catch (error: any) {
        const numberError = error.issues.find((issue: any) =>
          issue.message.toLowerCase().includes('number')
        );
        expect(numberError).toBeDefined();
      }
    });

    it('should provide helpful error for missing special character', () => {
      const payload = {
        email: 'test@example.com',
        password: 'NoSpecial123',
      };

      try {
        signupSchema.parse(payload);
        fail('Should have thrown validation error');
      } catch (error: any) {
        const specialError = error.issues.find((issue: any) =>
          issue.message.toLowerCase().includes('special')
        );
        expect(specialError).toBeDefined();
      }
    });
  });

  describe('Edge cases', () => {
    it('should accept password with all allowed special characters', () => {
      const payload = {
        email: 'test@example.com',
        password: 'Abc1!@#$%^&*()_+-=[]{}|;:,.<>?',
      };

      const result = signupSchema.parse(payload);
      expect(result.password).toBe('Abc1!@#$%^&*()_+-=[]{}|;:,.<>?');
    });

    it('should accept password with multiple uppercase letters', () => {
      const payload = {
        email: 'test@example.com',
        password: 'ABCD123efgh!',
      };

      const result = signupSchema.parse(payload);
      expect(result.password).toBe('ABCD123efgh!');
    });

    it('should accept password with emojis and special chars', () => {
      const payload = {
        email: 'test@example.com',
        password: 'Emoji123!👍🔒',
      };

      const result = signupSchema.parse(payload);
      expect(result.password).toBe('Emoji123!👍🔒');
    });

    it('should accept very long password', () => {
      const payload = {
        email: 'test@example.com',
        password: 'VeryLongPassword123!WithManyCharactersToTestLengthLimit',
      };

      const result = signupSchema.parse(payload);
      expect(result.password).toBe('VeryLongPassword123!WithManyCharactersToTestLengthLimit');
    });
  });
});
