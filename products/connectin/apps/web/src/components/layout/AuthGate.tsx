"use client";

import { useAuthContext } from "@/providers/AuthProvider";

/**
 * Defers rendering of protected page content until the auth token has
 * been restored from the refresh endpoint (needed after page reloads
 * when the access token is held in memory and the only persistent
 * signal is the httpOnly refreshToken cookie).
 *
 * While `isInitializing` is true a full-height spinner is shown so
 * data-fetching hooks inside the main layout don't fire API requests
 * before a valid Bearer token is available.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isInitializing } = useAuthContext();

  if (isInitializing) {
    return (
      <div
        className="flex items-center justify-center py-16"
        aria-label="Loading"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
