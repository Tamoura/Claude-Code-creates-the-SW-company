"use client";

import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface LanguageToggleProps {
  className?: string;
}

/**
 * Language toggle button that switches between Arabic and English.
 * Updates document direction (RTL/LTR) via I18nProvider.
 */
export function LanguageToggle({ className }: LanguageToggleProps) {
  const { i18n, t } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === "ar" ? "en" : "ar";
    i18n.changeLanguage(newLang);
  };

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5",
        "text-sm font-medium rounded-full",
        "text-[#475569] dark:text-[#CBD5E1]",
        "hover:bg-[#F1F5F9] dark:hover:bg-[#334155]",
        "transition-colors duration-100",
        "focus:outline-none focus:ring-2 focus:ring-[#57BBCE] focus:ring-offset-2",
        className
      )}
      aria-label={t("language.label")}
    >
      <Globe className="h-4 w-4" aria-hidden="true" />
      <span>{t("language.switchTo")}</span>
    </button>
  );
}
