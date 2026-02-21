"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function FeedPage() {
  const { t } = useTranslation("common");
  const [postContent, setPostContent] = useState("");

  return (
    <div className="space-y-4">
      {/* Post Composer */}
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <textarea
          aria-label={t("feed.composer")}
          value={postContent}
          onChange={(e) => setPostContent(e.target.value)}
          placeholder={t("feed.composer")}
          className="w-full resize-none rounded-lg border border-neutral-200 px-3 py-2 text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          rows={3}
        />
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            disabled={!postContent.trim()}
            className="rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {t("actions.post")}
          </button>
        </div>
      </div>

      {/* Feed - empty state */}
      <div className="rounded-xl bg-white p-8 text-center shadow-sm">
        <p className="text-neutral-500">{t("feed.empty")}</p>
      </div>
    </div>
  );
}
