"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function MessagesPage() {
  const { t } = useTranslation("common");
  const [search, setSearch] = useState("");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h1 className="text-xl font-semibold text-neutral-900">
          {t("messages.inbox")}
        </h1>
      </div>

      {/* Search */}
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <input
          type="text"
          aria-label={t("messages.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("messages.search")}
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>

      {/* Conversation list - empty state */}
      <div className="rounded-xl bg-white p-8 text-center shadow-sm">
        <p className="text-neutral-500">{t("noResults")}</p>
      </div>
    </div>
  );
}
