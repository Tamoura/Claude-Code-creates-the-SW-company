"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function NetworkPage() {
  const { t } = useTranslation("common");
  const [search, setSearch] = useState("");

  return (
    <div className="space-y-6">
      {/* Page Heading */}
      <h1 className="text-2xl font-bold text-neutral-900">
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
          className="w-full rounded-[10px] border-0 bg-[#F1F5F9] dark:bg-white/5 px-3 py-2.5 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:bg-white dark:focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all duration-[180ms]"
        />
      </div>

      {/* Pending Requests */}
      <section aria-labelledby="pending-requests-heading">
        <h2
          id="pending-requests-heading"
          className="mb-3 text-lg font-semibold text-neutral-800 tracking-[-0.01em]"
        >
          {t("network.pendingRequests")}
        </h2>
        <div className="rounded-[18px] bg-white dark:bg-[#1C1C1E] p-6 shadow-apple-md">
          <p className="text-center text-neutral-500">
            No pending requests.
          </p>
        </div>
      </section>

      {/* People You May Know */}
      <section aria-labelledby="people-you-may-know-heading">
        <h2
          id="people-you-may-know-heading"
          className="mb-3 text-lg font-semibold text-neutral-800 tracking-[-0.01em]"
        >
          {t("network.peopleYouMayKnow")}
        </h2>
        <div className="rounded-[18px] bg-white dark:bg-[#1C1C1E] p-6 shadow-apple-md">
          <p className="text-center text-neutral-500">
            No suggestions available right now.
          </p>
        </div>
      </section>

      {/* My Connections */}
      <section aria-labelledby="my-connections-heading">
        <h2
          id="my-connections-heading"
          className="mb-3 text-lg font-semibold text-neutral-800 tracking-[-0.01em]"
        >
          {t("network.myConnections")}
        </h2>
        <div className="rounded-[18px] bg-white dark:bg-[#1C1C1E] p-6 shadow-apple-md">
          <p className="text-center text-neutral-500">
            You have no connections yet.
          </p>
        </div>
      </section>
    </div>
  );
}
