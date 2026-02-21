"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n/config";

interface I18nProviderProps {
  children: ReactNode;
}

function updateDocumentAttributes(lng: string) {
  const dir = lng === "ar" ? "rtl" : "ltr";
  document.documentElement.setAttribute("dir", dir);
  document.documentElement.setAttribute("lang", lng);
}

/**
 * I18n provider that initializes i18next and updates the
 * HTML dir and lang attributes when the language changes.
 */
export function I18nProvider({ children }: I18nProviderProps) {
  const initialized = useRef<boolean>(null);

  if (initialized.current == null) {
    updateDocumentAttributes(i18n.language);
    initialized.current = true;
  }

  useEffect(() => {
    i18n.on("languageChanged", updateDocumentAttributes);
    return () => {
      i18n.off("languageChanged", updateDocumentAttributes);
    };
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
