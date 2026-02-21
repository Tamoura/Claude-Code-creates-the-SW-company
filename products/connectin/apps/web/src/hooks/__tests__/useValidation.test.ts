import { renderHook } from "@testing-library/react";
import { useValidation } from "../useValidation";

const mockT = (key: string) => {
  const translations: Record<string, string> = {
    "validation.emailRequired": "Email is required",
    "validation.emailInvalid": "Please enter a valid email address",
    "validation.passwordRequired": "Password is required",
    "validation.passwordMin": "Password must be at least 8 characters",
    "validation.passwordUpper": "Must contain at least one uppercase letter",
    "validation.passwordNumber": "Must contain at least one number",
    "validation.passwordSpecial": "Must contain at least one special character",
    "validation.nameRequired": "Display name is required",
    "validation.passwordsDoNotMatch": "Passwords do not match",
  };
  return translations[key] || key;
};

describe("useValidation", () => {
  function getHook() {
    const { result } = renderHook(() => useValidation(mockT));
    return result.current;
  }

  describe("validateEmail", () => {
    it("returns error for empty email", () => {
      expect(getHook().validateEmail("")).toBe("Email is required");
    });

    it("returns error for whitespace-only email", () => {
      expect(getHook().validateEmail("   ")).toBe("Email is required");
    });

    it("returns error for invalid email", () => {
      expect(getHook().validateEmail("notanemail")).toBe(
        "Please enter a valid email address"
      );
    });

    it("returns error for email without TLD", () => {
      expect(getHook().validateEmail("test@localhost")).toBeNull();
    });

    it("returns null for valid email", () => {
      expect(getHook().validateEmail("test@example.com")).toBeNull();
    });

    it("returns null for email with subdomain", () => {
      expect(getHook().validateEmail("user@mail.example.com")).toBeNull();
    });
  });

  describe("validatePassword", () => {
    it("returns error for empty password", () => {
      expect(getHook().validatePassword("")).toBe("Password is required");
    });

    it("returns error for short password", () => {
      expect(getHook().validatePassword("Ab1!")).toBe(
        "Password must be at least 8 characters"
      );
    });

    it("returns error for password without uppercase", () => {
      expect(getHook().validatePassword("password1!")).toBe(
        "Must contain at least one uppercase letter"
      );
    });

    it("returns error for password without number", () => {
      expect(getHook().validatePassword("Password!")).toBe(
        "Must contain at least one number"
      );
    });

    it("returns error for password without special char", () => {
      expect(getHook().validatePassword("Password1")).toBe(
        "Must contain at least one special character"
      );
    });

    it("returns null for valid password", () => {
      expect(getHook().validatePassword("Password1!")).toBeNull();
    });
  });

  describe("validateLoginForm", () => {
    it("returns errors for empty fields", () => {
      const errors = getHook().validateLoginForm("", "");
      expect(errors.email).toBe("Email is required");
      expect(errors.password).toBe("Password is required");
    });

    it("returns no errors for valid input", () => {
      const errors = getHook().validateLoginForm(
        "test@example.com",
        "Password1!"
      );
      expect(Object.keys(errors)).toHaveLength(0);
    });
  });

  describe("validateRegisterForm", () => {
    it("returns errors for all empty fields", () => {
      const errors = getHook().validateRegisterForm("", "", "", "");
      expect(errors.displayName).toBe("Display name is required");
      expect(errors.email).toBe("Email is required");
      expect(errors.password).toBe("Password is required");
    });

    it("returns error for password mismatch", () => {
      const errors = getHook().validateRegisterForm(
        "Test",
        "test@example.com",
        "Password1!",
        "Password2!"
      );
      expect(errors.confirmPassword).toBe("Passwords do not match");
    });

    it("returns no errors for valid input", () => {
      const errors = getHook().validateRegisterForm(
        "Test User",
        "test@example.com",
        "Password1!",
        "Password1!"
      );
      expect(Object.keys(errors)).toHaveLength(0);
    });
  });
});
