"use client";

import { useTranslation } from "react-i18next";

/**
 * Returns the current text direction based on i18n language.
 * Arabic = rtl, English = ltr.
 */
export function useDirection() {
  const { i18n } = useTranslation();
  const direction = i18n.language === "ar" ? "rtl" : "ltr";
  const isRtl = direction === "rtl";

  return { direction, isRtl, language: i18n.language } as const;
}
