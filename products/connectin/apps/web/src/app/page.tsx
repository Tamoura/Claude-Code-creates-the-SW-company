"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { Logo } from "@/components/shared/Logo";
import { LanguageToggle } from "@/components/layout/LanguageToggle";

const FEATURES = [
  { key: "ai", icon: "sparkles" },
  { key: "arabic", icon: "globe" },
  { key: "privacy", icon: "shield" },
  { key: "openSource", icon: "code" },
] as const;

const ICON_MAP: Record<string, string> = {
  sparkles: "\u2728",
  globe: "\uD83C\uDF10",
  shield: "\uD83D\uDEE1\uFE0F",
  code: "\uD83D\uDCBB",
};

export default function LandingPage() {
  const { t } = useTranslation("common");

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4">
        <Logo size="md" />
        <div className="flex items-center gap-4">
          <LanguageToggle />
          <Link
            href="/login"
            className="text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            {t("landing.hero.login")}
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="max-w-2xl whitespace-pre-line text-4xl font-bold leading-tight text-neutral-900 md:text-5xl">
          {t("landing.hero.title")}
        </h1>
        <p className="mt-4 max-w-lg text-lg text-neutral-500">
          {t("landing.hero.subtitle")}
        </p>
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href="/register"
            className="rounded-lg bg-primary-600 px-8 py-3 font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            {t("landing.hero.cta")}
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="bg-neutral-50 px-4 py-16">
        <div className="mx-auto grid max-w-4xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ key, icon }) => (
            <div
              key={key}
              className="rounded-xl bg-white p-6 text-center shadow-sm"
            >
              <div className="mb-3 text-3xl">{ICON_MAP[icon]}</div>
              <h3 className="font-semibold text-neutral-900">
                {t(`landing.features.${key}.title`)}
              </h3>
              <p className="mt-1 text-sm text-neutral-500">
                {t(`landing.features.${key}.description`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200 px-4 py-8">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex gap-6 text-sm text-neutral-500">
            <span>{t("landing.footer.about")}</span>
            <span>{t("landing.footer.privacy")}</span>
            <span>{t("landing.footer.terms")}</span>
            <span>{t("landing.footer.contact")}</span>
          </div>
          <p className="text-sm text-neutral-400">
            &copy; 2026 {t("landing.footer.copyright")}
          </p>
        </div>
      </footer>
    </div>
  );
}
