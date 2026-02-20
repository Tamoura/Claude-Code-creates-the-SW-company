"use client";

import { useEffect, useState, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n/config";

interface I18nProviderProps {
  children: ReactNode;
}

/**
 * I18n provider that initializes i18next and updates the
 * HTML dir and lang attributes when the language changes.
 */
export function I18nProvider({ children }: I18nProviderProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const updateDocumentAttributes = (lng: string) => {
      const dir = lng === "ar" ? "rtl" : "ltr";
      document.documentElement.setAttribute("dir", dir);
      document.documentElement.setAttribute("lang", lng);
    };

    // Set initial attributes
    updateDocumentAttributes(i18n.language);

    // Listen for language changes
    i18n.on("languageChanged", updateDocumentAttributes);
    setIsReady(true);

    return () => {
      i18n.off("languageChanged", updateDocumentAttributes);
    };
  }, []);

  if (!isReady) return null;

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
