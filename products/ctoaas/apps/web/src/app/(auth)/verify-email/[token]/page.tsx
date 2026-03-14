"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api";

type VerifyState = "loading" | "success" | "error" | "pending";

export default function VerifyEmailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const token = params.token as string;
  const pendingMessage = searchParams.get("message");

  const [state, setState] = useState<VerifyState>(
    token === "pending" ? "pending" : "loading"
  );
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (token === "pending") return;

    let cancelled = false;

    async function verifyEmail() {
      const result = await apiClient.post("/auth/verify-email", {
        token,
      });

      if (cancelled) return;

      if (result.success) {
        setState("success");
        setTimeout(() => {
          if (!cancelled) {
            router.push("/login");
          }
        }, 2000);
      } else {
        setState("error");
        setErrorMessage(
          result.error?.message ||
            "Verification failed. The link may have expired."
        );
      }
    }

    verifyEmail();

    return () => {
      cancelled = true;
    };
  }, [token, router]);

  if (state === "pending") {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-indigo-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Check your email
        </h1>
        <p className="text-gray-500 mb-6">
          {pendingMessage ||
            "We sent a verification link to your email. Please click it to activate your account."}
        </p>

        <div className="space-y-3">
          <Link
            href="/login"
            className="block w-full bg-indigo-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 text-center min-h-[48px] leading-[32px] transition-colors"
          >
            Go to sign in
          </Link>
          <Link
            href="/"
            className="block text-sm text-gray-500 hover:text-gray-700 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded px-2 py-1"
          >
            Return to home page
          </Link>
        </div>
      </div>
    );
  }

  if (state === "loading") {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-indigo-600 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Verifying your email
        </h1>
        <p className="text-gray-500">
          Please wait while we verify your email address...
        </p>
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Email verified
        </h1>
        <p className="text-gray-500 mb-6">
          Your email has been verified successfully. Redirecting to
          sign in...
        </p>

        <Link
          href="/login"
          className="inline-block w-full bg-indigo-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 text-center min-h-[48px] leading-[32px] transition-colors"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  // error state
  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg
          className="w-8 h-8 text-red-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Verification failed
      </h1>
      <p role="alert" className="text-gray-500 mb-6">
        {errorMessage}
      </p>

      <div className="space-y-3">
        <Link
          href="/signup"
          className="block w-full bg-indigo-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 text-center min-h-[48px] leading-[32px] transition-colors"
        >
          Create a new account
        </Link>
        <Link
          href="/login"
          className="block text-sm text-gray-500 hover:text-gray-700 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded px-2 py-1"
        >
          Go to sign in
        </Link>
      </div>
    </div>
  );
}
