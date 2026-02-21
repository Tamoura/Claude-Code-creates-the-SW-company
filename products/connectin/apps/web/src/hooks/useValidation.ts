"use client";

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const PASSWORD_MIN_LENGTH = 8;

interface ValidationErrors {
  [field: string]: string;
}

type TranslateFunction = (key: string) => string;

export function useValidation(t: TranslateFunction) {
  function validateEmail(email: string): string | null {
    if (!email.trim()) return t("validation.emailRequired");
    if (!EMAIL_REGEX.test(email)) return t("validation.emailInvalid");
    return null;
  }

  function validatePassword(password: string): string | null {
    if (!password) return t("validation.passwordRequired");
    if (password.length < PASSWORD_MIN_LENGTH)
      return t("validation.passwordMin");
    if (!/[A-Z]/.test(password)) return t("validation.passwordUpper");
    if (!/[0-9]/.test(password)) return t("validation.passwordNumber");
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password))
      return t("validation.passwordSpecial");
    return null;
  }

  function validateLoginForm(email: string, password: string): ValidationErrors {
    const errors: ValidationErrors = {};
    const emailError = validateEmail(email);
    if (emailError) errors.email = emailError;

    if (!password) {
      errors.password = t("validation.passwordRequired");
    } else if (password.length < PASSWORD_MIN_LENGTH) {
      errors.password = t("validation.passwordMin");
    }
    return errors;
  }

  function validateRegisterForm(
    displayName: string,
    email: string,
    password: string,
    confirmPassword: string
  ): ValidationErrors {
    const errors: ValidationErrors = {};

    if (!displayName.trim()) errors.displayName = t("validation.nameRequired");

    const emailError = validateEmail(email);
    if (emailError) errors.email = emailError;

    const passwordError = validatePassword(password);
    if (passwordError) errors.password = passwordError;

    if (password && confirmPassword && password !== confirmPassword) {
      errors.confirmPassword = t("validation.passwordsDoNotMatch");
    }

    return errors;
  }

  return {
    validateEmail,
    validatePassword,
    validateLoginForm,
    validateRegisterForm,
  };
}
