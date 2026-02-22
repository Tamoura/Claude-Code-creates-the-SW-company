"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useConnections } from "@/hooks/useConnections";
import { UserAvatar } from "@/components/shared/UserAvatar";

export default function NetworkPage() {
  const { t } = useTranslation("common");
  const [search, setSearch] = useState("");
  const {
    connections,
    pendingIncoming,
    isLoading,
    error,
    acceptConnection,
    rejectConnection,
  } = useConnections();

  const filteredConnections = connections.filter((c) =>
    c.displayName.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[18px] bg-white dark:bg-[#1C1C1E] p-8 text-center shadow-apple-md">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Heading */}
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
        {t("network.myNetwork")}
      </h1>

      {/* Search Input */}
      <div className="rounded-[18px] bg-white dark:bg-[#1C1C1E] p-4 shadow-apple-md">
        <input
          type="text"
          aria-label={t("network.searchConnections")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("network.searchConnections")}
          className="w-full rounded-[10px] border-0 bg-[#F1F5F9] dark:bg-white/5 px-3 py-2.5 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-500 focus:bg-white dark:focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all duration-[180ms]"
        />
      </div>

      {/* Pending Requests */}
      {pendingIncoming.length > 0 && (
        <section aria-labelledby="pending-requests-heading">
          <h2
            id="pending-requests-heading"
            className="mb-3 text-lg font-semibold text-neutral-800 dark:text-neutral-200 tracking-[-0.01em]"
          >
            {t("network.pendingRequests")}
            <span className="ml-2 rounded-full bg-primary-100 dark:bg-primary-900/40 px-2.5 py-0.5 text-sm font-semibold text-primary-700">
              {pendingIncoming.length}
            </span>
          </h2>
          <ul className="space-y-3">
            {pendingIncoming.map((request) => (
              <li
                key={request.connectionId}
                className="rounded-[18px] bg-white dark:bg-[#1C1C1E] p-4 shadow-apple-md flex items-center gap-3"
              >
                <UserAvatar
                  displayName={request.user.displayName}
                  avatarUrl={request.user.avatarUrl}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <p className="truncate font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
                    {request.user.displayName}
                  </p>
                  {request.user.headlineEn && (
                    <p className="truncate text-xs text-neutral-500">
                      {request.user.headlineEn}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => void acceptConnection(request.connectionId)}
                    aria-label={`Accept connection from ${request.user.displayName}`}
                    className="rounded-full bg-primary-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-primary-700 hover:-translate-y-0.5 hover:shadow-apple-sm active:scale-[0.97] transition-all duration-[180ms]"
                  >
                    {t("actions.accept")}
                  </button>
                  <button
                    type="button"
                    onClick={() => void rejectConnection(request.connectionId)}
                    aria-label={`Decline connection from ${request.user.displayName}`}
                    className="rounded-full border border-neutral-300 dark:border-white/20 px-4 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/5 hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-[180ms]"
                  >
                    {t("actions.decline")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* My Connections */}
      <section aria-labelledby="my-connections-heading">
        <h2
          id="my-connections-heading"
          className="mb-3 text-lg font-semibold text-neutral-800 dark:text-neutral-200 tracking-[-0.01em]"
        >
          {t("network.myConnections")}
          {connections.length > 0 && (
            <span className="ml-2 rounded-full bg-neutral-100 dark:bg-white/10 px-2.5 py-0.5 text-sm font-semibold text-neutral-600 dark:text-neutral-400">
              {connections.length}
            </span>
          )}
        </h2>

        {filteredConnections.length === 0 ? (
          <div className="rounded-[18px] bg-white dark:bg-[#1C1C1E] p-6 shadow-apple-md text-center">
            <p className="text-neutral-500">
              {search
                ? t("network.noSearchResults")
                : t("network.noConnections")}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {filteredConnections.map((connection) => (
              <li
                key={connection.userId}
                className="rounded-[18px] bg-white dark:bg-[#1C1C1E] p-4 shadow-apple-md flex items-center gap-3 hover:-translate-y-0.5 transition-all duration-[180ms]"
              >
                <UserAvatar
                  displayName={connection.displayName}
                  avatarUrl={connection.avatarUrl}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <p className="truncate font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
                    {connection.displayName}
                  </p>
                  {connection.headline && (
                    <p className="truncate text-xs text-neutral-500">
                      {connection.headline}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
