"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  changePasswordSchema,
  type ChangePasswordFormData,
} from "@/lib/validations/settings";
import { apiClient } from "@/lib/api";

interface AccountInfo {
  email: string;
}

export default function AccountSettingsPage() {
  const [email, setEmail] = useState<string>("");
  const [isLoadingAccount, setIsLoadingAccount] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(
    null
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  });

  const loadAccount = useCallback(async () => {
    setIsLoadingAccount(true);
    const result = await apiClient.get<AccountInfo>("/auth/me");
    if (result.success && result.data) {
      setEmail(result.data.email);
    }
    setIsLoadingAccount(false);
  }, []);

  useEffect(() => {
    loadAccount();
  }, [loadAccount]);

  const onSubmit = async (data: ChangePasswordFormData) => {
    setServerError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const result = await apiClient.put("/auth/change-password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      if (result.success) {
        setSuccessMessage("Password changed successfully.");
        reset();
      } else {
        setServerError(
          result.error?.message || "Failed to change password."
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

  const handleDeleteAccount = async () => {
    setDeleteError(null);
    setIsDeleting(true);

    try {
      const result = await apiClient.delete("/auth/account");
      if (result.success) {
        window.location.href = "/login";
      } else {
        setDeleteError(
          result.error?.message || "Failed to delete account."
        );
      }
    } catch {
      setDeleteError(
        "An unexpected error occurred. Please try again."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const inputClassName = (hasError: boolean) =>
    `w-full px-3 py-2 border rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[48px] ${
      hasError ? "border-red-500" : "border-gray-300"
    }`;

  if (isLoadingAccount) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div className="bg-background rounded-xl p-6 border border-border">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4" />
            <div className="h-10 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Email display */}
      <div className="bg-background rounded-xl p-6 border border-border">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Email Address
        </h2>
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            readOnly
            aria-readonly="true"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 min-h-[48px] cursor-not-allowed"
          />
          <p className="text-gray-500 text-xs mt-1">
            Contact support to change your email address.
          </p>
        </div>
      </div>

      {/* Change password */}
      <div className="bg-background rounded-xl p-6 border border-border">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Change Password
        </h2>

        {serverError && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"
          >
            {serverError}
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm"
          >
            {successMessage}
          </div>
        )}

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <div>
            <label
              htmlFor="currentPassword"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Current password
            </label>
            <input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              aria-invalid={
                errors.currentPassword ? "true" : "false"
              }
              aria-describedby={
                errors.currentPassword
                  ? "currentPassword-error"
                  : undefined
              }
              className={inputClassName(!!errors.currentPassword)}
              placeholder="Enter current password"
              {...register("currentPassword")}
            />
            {errors.currentPassword && (
              <p
                id="currentPassword-error"
                role="alert"
                className="text-red-600 text-sm mt-1"
              >
                {errors.currentPassword.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="newPassword"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              New password
            </label>
            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              aria-invalid={errors.newPassword ? "true" : "false"}
              aria-describedby={
                errors.newPassword
                  ? "newPassword-error"
                  : undefined
              }
              className={inputClassName(!!errors.newPassword)}
              placeholder="At least 8 characters"
              {...register("newPassword")}
            />
            {errors.newPassword && (
              <p
                id="newPassword-error"
                role="alert"
                className="text-red-600 text-sm mt-1"
              >
                {errors.newPassword.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="confirmNewPassword"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Confirm new password
            </label>
            <input
              id="confirmNewPassword"
              type="password"
              autoComplete="new-password"
              aria-invalid={
                errors.confirmNewPassword ? "true" : "false"
              }
              aria-describedby={
                errors.confirmNewPassword
                  ? "confirmNewPassword-error"
                  : undefined
              }
              className={inputClassName(!!errors.confirmNewPassword)}
              placeholder="Repeat new password"
              {...register("confirmNewPassword")}
            />
            {errors.confirmNewPassword && (
              <p
                id="confirmNewPassword-error"
                role="alert"
                className="text-red-600 text-sm mt-1"
              >
                {errors.confirmNewPassword.message}
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-indigo-600 text-white py-2.5 px-6 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px] transition-colors"
            >
              {isSubmitting ? "Updating..." : "Update password"}
            </button>
          </div>
        </form>
      </div>

      {/* Danger zone */}
      <div className="bg-background rounded-xl p-6 border border-red-200">
        <h2 className="text-lg font-semibold text-red-600 mb-2">
          Danger Zone
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Permanently delete your account and all associated data. This
          action cannot be undone.
        </p>

        {deleteError && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"
          >
            {deleteError}
          </div>
        )}

        {!showDeleteConfirm ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="bg-red-600 text-white py-2.5 px-6 rounded-lg font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 min-h-[48px] transition-colors"
          >
            Delete account
          </button>
        ) : (
          <div
            className="bg-red-50 rounded-lg p-4 border border-red-200"
            role="alertdialog"
            aria-label="Confirm account deletion"
          >
            <p className="text-sm font-medium text-red-800 mb-3">
              Are you sure you want to delete your account? This will
              permanently remove all your data including advisory
              history, company profile, and preferences.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] transition-colors"
              >
                {isDeleting
                  ? "Deleting..."
                  : "Yes, delete my account"}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="bg-white text-gray-700 py-2 px-4 rounded-lg font-medium border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 min-h-[44px] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
