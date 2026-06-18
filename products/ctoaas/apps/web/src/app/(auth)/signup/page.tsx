"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  signupSchema,
  type SignupFormData,
} from "@/lib/validations/auth";
import { apiClient } from "@/lib/api";

export default function SignupPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormData) => {
    setServerError(null);
    setIsSubmitting(true);

    try {
      const result = await apiClient.post("/auth/signup", {
        name: data.name,
        email: data.email,
        password: data.password,
        companyName: data.companyName,
      });

      if (result.success) {
        router.push(
          "/verify-email/pending?message=Check+your+email+to+verify+your+account"
        );
      } else {
        setServerError(
          result.error?.message ||
            "Registration failed. Please try again."
        );
      }
    } catch {
      setServerError(
        "An unexpected error occurred. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Create your account
      </h1>
      <p className="text-gray-500 mb-6">
        Start receiving AI-powered CTO advisory today.
      </p>

      {serverError && (
        <div
          role="alert"
          className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"
        >
          {serverError}
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
        noValidate
      >
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Full name
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            aria-invalid={errors.name ? "true" : "false"}
            aria-describedby={
              errors.name ? "name-error" : undefined
            }
            className={`w-full px-3 py-2 border rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[48px] ${
              errors.name ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="Jane Smith"
            {...register("name")}
          />
          {errors.name && (
            <p
              id="name-error"
              role="alert"
              className="text-red-600 text-sm mt-1"
            >
              {errors.name.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Work email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={errors.email ? "true" : "false"}
            aria-describedby={
              errors.email ? "email-error" : undefined
            }
            className={`w-full px-3 py-2 border rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[48px] ${
              errors.email ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="you@company.com"
            {...register("email")}
          />
          {errors.email && (
            <p
              id="email-error"
              role="alert"
              className="text-red-600 text-sm mt-1"
            >
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="companyName"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Company name
          </label>
          <input
            id="companyName"
            type="text"
            autoComplete="organization"
            aria-invalid={errors.companyName ? "true" : "false"}
            aria-describedby={
              errors.companyName ? "companyName-error" : undefined
            }
            className={`w-full px-3 py-2 border rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[48px] ${
              errors.companyName
                ? "border-red-500"
                : "border-gray-300"
            }`}
            placeholder="Acme Inc."
            {...register("companyName")}
          />
          {errors.companyName && (
            <p
              id="companyName-error"
              role="alert"
              className="text-red-600 text-sm mt-1"
            >
              {errors.companyName.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={errors.password ? "true" : "false"}
            aria-describedby={
              errors.password ? "password-error" : undefined
            }
            className={`w-full px-3 py-2 border rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[48px] ${
              errors.password ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="At least 8 characters"
            {...register("password")}
          />
          {errors.password && (
            <p
              id="password-error"
              role="alert"
              className="text-red-600 text-sm mt-1"
            >
              {errors.password.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Confirm password
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            aria-invalid={
              errors.confirmPassword ? "true" : "false"
            }
            aria-describedby={
              errors.confirmPassword
                ? "confirmPassword-error"
                : undefined
            }
            className={`w-full px-3 py-2 border rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[48px] ${
              errors.confirmPassword
                ? "border-red-500"
                : "border-gray-300"
            }`}
            placeholder="Repeat your password"
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p
              id="confirmPassword-error"
              role="alert"
              className="text-red-600 text-sm mt-1"
            >
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-indigo-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] transition-colors"
        >
          {isSubmitting ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-indigo-600 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
