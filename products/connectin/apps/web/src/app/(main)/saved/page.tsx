"use client";

import { useTranslation } from "react-i18next";

export default function SavedPage() {
  const { t } = useTranslation("common");

  return (
    <div className="space-y-4">
      <div className="rounded-xl rounded-[18px] bg-white dark:bg-[#1C1C1E] p-4 shadow-apple-md">
        <h1 className="text-xl font-semibold text-neutral-900">
          {t("nav.saved")}
        </h1>
      </div>
      <div className="rounded-xl rounded-[18px] bg-white dark:bg-[#1C1C1E] p-8 text-center shadow-apple-md">
        <p className="text-neutral-500">{t("noResults")}</p>
      </div>
    </div>
  );
}
