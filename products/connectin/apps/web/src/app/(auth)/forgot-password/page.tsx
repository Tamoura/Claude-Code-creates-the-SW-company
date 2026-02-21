"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function ForgotPasswordPage() {
  const { t } = useTranslation("common");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="rounded-[18px] glass-light dark:glass-dark p-8 shadow-apple-lg text-center">
        <h1 className="mb-4 text-2xl font-bold text-neutral-900 tracking-[-0.02em]">
          {t("auth.checkEmail", "Check your email")}
        </h1>
        <p className="text-neutral-600">
          {t(
            "auth.resetInstructions",
            "If an account exists with this email, you will receive password reset instructions."
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[18px] glass-light dark:glass-dark p-8 shadow-apple-lg">
      <h1 className="mb-6 text-2xl font-bold text-neutral-900 tracking-[-0.02em]">
        {t("auth.forgotPassword", "Forgot Password")}
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="mb-1 block text-sm font-medium text-neutral-600"
          >
            {t("auth.email", "Email")}
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-[10px] border-0 bg-[#F1F5F9] px-3 py-2.5 text-neutral-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all duration-[180ms]"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-full bg-primary-600 px-4 py-2.5 font-medium text-white shadow-apple-sm hover:bg-primary-700 hover:-translate-y-0.5 hover:shadow-apple-md active:scale-[0.97] transition-all duration-[180ms]"
        >
          {t("auth.sendResetLink", "Send Reset Link")}
        </button>
      </form>
    </div>
  );
}
