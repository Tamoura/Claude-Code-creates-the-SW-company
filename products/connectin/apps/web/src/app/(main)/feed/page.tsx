"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function FeedPage() {
  const { t } = useTranslation("common");
  const [postContent, setPostContent] = useState("");

  return (
    <div className="space-y-4">
      {/* Post Composer */}
      <div className="rounded-[18px] bg-white dark:bg-[#1C1C1E] p-4 shadow-apple-md">
        <textarea
          aria-label={t("feed.composer")}
          value={postContent}
          onChange={(e) => setPostContent(e.target.value)}
          placeholder={t("feed.composer")}
          className="w-full resize-none rounded-[10px] border-0 bg-[#F1F5F9] dark:bg-white/5 px-3 py-2.5 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:bg-white dark:focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all duration-[180ms]"
          rows={3}
        />
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            disabled={!postContent.trim()}
            className="rounded-full bg-primary-600 px-6 py-2 text-sm font-medium text-white shadow-apple-sm hover:bg-primary-700 hover:-translate-y-0.5 hover:shadow-apple-md active:scale-[0.97] disabled:opacity-50 transition-all duration-[180ms]"
          >
            {t("actions.post")}
          </button>
        </div>
      </div>

      {/* Feed - empty state */}
      <div className="rounded-[18px] bg-white dark:bg-[#1C1C1E] p-8 text-center shadow-apple-md">
        <p className="text-neutral-500">{t("feed.empty")}</p>
      </div>
    </div>
  );
}
