"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useAuthContext } from "@/providers/AuthProvider";

export default function LoginPage() {
  const { t } = useTranslation("auth");
  const router = useRouter();
  const { login, isLoading } = useAuthContext();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!email.trim()) {
      newErrors.email = t("validation.emailRequired");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = t("validation.emailInvalid");
    }

    if (!password) {
      newErrors.password = t("validation.passwordRequired");
    } else if (password.length < 8) {
      newErrors.password = t("validation.passwordMin");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!validate()) return;

    const success = await login(email, password);
    if (success) {
      router.push("/feed");
    } else {
      setSubmitError("Invalid credentials");
    }
  }

  return (
    <div className="rounded-xl bg-white p-8 shadow-sm">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-neutral-900">
          {t("login.title")}
        </h1>
        <p className="mt-1 text-neutral-500">{t("login.subtitle")}</p>
      </div>

      {submitError && (
        <div className="mb-4 rounded-lg bg-error-50 p-3 text-sm text-error-700">
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="name@example.com"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-error-700">{errors.email}</p>
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          {errors.password && (
            <p className="mt-1 text-sm text-error-700">{errors.password}</p>
          )}
        </div>

        <div className="mb-6 text-end">
          <Link
            href="/forgot-password"
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            {t("login.forgotPassword")}
          </Link>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-lg bg-primary-600 py-2.5 font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isLoading ? "..." : t("login.submit")}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-500">
        {t("login.noAccount")}{" "}
        <Link
          href="/register"
          className="font-medium text-primary-600 hover:text-primary-700"
        >
          {t("login.register")}
        </Link>
      </p>
    </div>
  );
}
