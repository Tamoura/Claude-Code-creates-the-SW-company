"use client";

import { useTranslation } from "react-i18next";

export default function SavedPage() {
  const { t } = useTranslation("common");

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h1 className="text-xl font-semibold text-neutral-900">
          {t("nav.saved")}
        </h1>
      </div>
      <div className="rounded-xl bg-white p-8 text-center shadow-sm">
        <p className="text-neutral-500">{t("noResults")}</p>
      </div>
    </div>
  );
}
