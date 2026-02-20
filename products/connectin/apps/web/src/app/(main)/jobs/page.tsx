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
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("jobs.search")}
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
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
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary-600 bg-primary-600 text-white"
                  : "border-neutral-300 bg-white text-neutral-700 hover:border-primary-500 hover:text-primary-600",
              ].join(" ")}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Job listings - empty state */}
      <div className="rounded-xl bg-white p-8 text-center shadow-sm">
        <p className="text-neutral-500">{t("noResults")}</p>
      </div>
    </div>
  );
}
