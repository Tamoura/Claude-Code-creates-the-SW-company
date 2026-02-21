"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";

const FILTERS = ["jobs.remote", "jobs.hybrid", "jobs.onsite"] as const;

export default function JobsPage() {
  const { t } = useTranslation("common");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="rounded-[18px] bg-white dark:bg-[#1C1C1E] p-4 shadow-apple-md">
        <input
          type="text"
          aria-label={t("jobs.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("jobs.search")}
          className="w-full rounded-[10px] border-0 bg-[#F1F5F9] dark:bg-white/5 px-3 py-2.5 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:bg-white dark:focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all duration-[180ms]"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filterKey) => {
          const label = t(filterKey);
          const isActive = activeFilter === filterKey;
          return (
            <button
              key={filterKey}
              type="button"
              onClick={() =>
                setActiveFilter(isActive ? null : filterKey)
              }
              className={[
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-[180ms]",
                isActive
                  ? "border-primary-600 bg-primary-600 text-white shadow-apple-sm"
                  : "border-neutral-300 bg-white dark:bg-[#1C1C1E] text-neutral-700 dark:text-neutral-300 hover:border-primary-500 hover:text-primary-600 hover:-translate-y-0.5",
              ].join(" ")}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Job listings - empty state */}
      <div className="rounded-[18px] bg-white dark:bg-[#1C1C1E] p-8 text-center shadow-apple-md">
        <p className="text-neutral-500">{t("noResults")}</p>
      </div>
    </div>
  );
}
