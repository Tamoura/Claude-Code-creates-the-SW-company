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
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("network.searchConnections")}
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>

      {/* Pending Requests */}
      <section aria-labelledby="pending-requests-heading">
        <h2
          id="pending-requests-heading"
          className="mb-3 text-lg font-semibold text-neutral-800"
        >
          {t("network.pendingRequests")}
        </h2>
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-center text-neutral-500">
            No pending requests.
          </p>
        </div>
      </section>

      {/* People You May Know */}
      <section aria-labelledby="people-you-may-know-heading">
        <h2
          id="people-you-may-know-heading"
          className="mb-3 text-lg font-semibold text-neutral-800"
        >
          {t("network.peopleYouMayKnow")}
        </h2>
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-center text-neutral-500">
            No suggestions available right now.
          </p>
        </div>
      </section>

      {/* My Connections */}
      <section aria-labelledby="my-connections-heading">
        <h2
          id="my-connections-heading"
          className="mb-3 text-lg font-semibold text-neutral-800"
        >
          {t("network.myConnections")}
        </h2>
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <p className="text-center text-neutral-500">
            You have no connections yet.
          </p>
        </div>
      </section>
    </div>
  );
}
