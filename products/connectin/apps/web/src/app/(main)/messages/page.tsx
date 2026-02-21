"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function MessagesPage() {
  const { t } = useTranslation("common");
  const [search, setSearch] = useState("");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-[18px] bg-white dark:bg-[#1C1C1E] p-4 shadow-apple-md">
        <h1 className="text-xl font-semibold text-neutral-900">
          {t("messages.inbox")}
        </h1>
      </div>

      {/* Search */}
      <div className="rounded-[18px] bg-white dark:bg-[#1C1C1E] p-4 shadow-apple-md">
        <input
          type="text"
          aria-label={t("messages.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("messages.search")}
          className="w-full rounded-[10px] border-0 bg-[#F1F5F9] dark:bg-white/5 px-3 py-2.5 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:bg-white dark:focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all duration-[180ms]"
        />
      </div>

      {/* Conversation list - empty state */}
      <div className="rounded-[18px] bg-white dark:bg-[#1C1C1E] p-8 text-center shadow-apple-md">
        <p className="text-neutral-500">{t("noResults")}</p>
      </div>
    </div>
  );
}
