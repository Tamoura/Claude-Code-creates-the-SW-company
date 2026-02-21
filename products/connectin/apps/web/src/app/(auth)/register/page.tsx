"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "@/providers/AuthProvider";

export default function RegisterPage() {
  const { t } = useTranslation("auth");
  const router = useRouter();
  const { register, isLoading } = useAuthContext();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!displayName.trim()) {
      newErrors.displayName = t("validation.nameRequired");
    }

    if (!email.trim()) {
      newErrors.email = t("validation.emailRequired");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = t("validation.emailInvalid");
    }

    if (!password) {
      newErrors.password = t("validation.passwordRequired");
    } else if (password.length < 8) {
      newErrors.password = t("validation.passwordMin");
    } else if (!/[A-Z]/.test(password)) {
      newErrors.password = t("validation.passwordUpper");
    } else if (!/[0-9]/.test(password)) {
      newErrors.password = t("validation.passwordNumber");
    } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      newErrors.password = t("validation.passwordSpecial");
    }

    if (password && confirmPassword && password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!validate()) return;

    const success = await register(displayName, email, password);
    if (success) {
      router.push("/feed");
    } else {
      setSubmitError("Registration failed");
    }
  }

  return (
    <div className="rounded-xl bg-white p-8 shadow-sm">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-neutral-900">
          {t("register.title")}
        </h1>
        <p className="mt-1 text-neutral-500">{t("register.subtitle")}</p>
      </div>

      {submitError && (
        <div role="alert" className="mb-4 rounded-lg bg-error-50 p-3 text-sm text-error-700">
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-4">
          <label
            htmlFor="displayName"
            className="mb-1 block text-sm font-medium text-neutral-700"
          >
            {t("fields.displayName")}
          </label>
          <input
            id="displayName"
            type="text"
            autoComplete="name"
            aria-describedby={errors.displayName ? "displayName-error" : undefined}
            aria-invalid={!!errors.displayName}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          {errors.displayName && (
            <p id="displayName-error" role="alert" className="mt-1 text-sm text-error-700">
              {errors.displayName}
            </p>
          )}
        </div>

        <div className="mb-4">
          <label
            htmlFor="email"
            className="mb-1 block text-sm font-medium text-neutral-700"
          >
            {t("fields.email")}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            aria-describedby={errors.email ? "email-error" : undefined}
            aria-invalid={!!errors.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="name@example.com"
          />
          {errors.email && (
            <p id="email-error" role="alert" className="mt-1 text-sm text-error-700">{errors.email}</p>
          )}
        </div>

        <div className="mb-4">
          <label
            htmlFor="password"
            className="mb-1 block text-sm font-medium text-neutral-700"
          >
            {t("fields.password")}
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-describedby={errors.password ? "password-error password-hint" : "password-hint"}
            aria-invalid={!!errors.password}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <p id="password-hint" className="mt-1 text-xs text-neutral-400">
            {t("passwordHint")}
          </p>
          {errors.password && (
            <p id="password-error" role="alert" className="mt-1 text-sm text-error-700">{errors.password}</p>
          )}
        </div>

        <div className="mb-6">
          <label
            htmlFor="confirmPassword"
            className="mb-1 block text-sm font-medium text-neutral-700"
          >
            {t("fields.confirmPassword")}
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
            aria-invalid={!!errors.confirmPassword}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          {errors.confirmPassword && (
            <p id="confirmPassword-error" role="alert" className="mt-1 text-sm text-error-700">
              {errors.confirmPassword}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-lg bg-primary-600 py-2.5 font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isLoading ? "..." : t("register.submit")}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-500">
        {t("register.hasAccount")}{" "}
        <Link
          href="/login"
          className="font-medium text-primary-600 hover:text-primary-700"
        >
          {t("register.login")}
        </Link>
      </p>
    </div>
  );
}
