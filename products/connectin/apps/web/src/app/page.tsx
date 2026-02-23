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
    <div className="relative flex min-h-screen flex-col bg-white overflow-hidden">
      {/* Decorative radial glow */}
      <div
        className="pointer-events-none absolute top-[-20%] start-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-[radial-gradient(circle,rgba(12,154,184,0.08)_0%,transparent_70%)]"
        aria-hidden="true"
      />

      {/* Header */}
      <header className="relative flex items-center justify-between px-6 py-4 backdrop-blur-md bg-white/60">
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
      <section className="relative flex flex-1 flex-col items-center justify-center px-4 py-20 md:py-24 text-center">
        <h1 className="max-w-3xl whitespace-pre-line text-5xl font-bold leading-[1.05] tracking-[-0.03em] text-neutral-900 md:text-6xl lg:text-7xl">
          {t("landing.hero.title")}
        </h1>
        <p className="mt-6 max-w-lg text-xl leading-relaxed text-neutral-500">
          {t("landing.hero.subtitle")}
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href="/register"
            className="rounded-full bg-primary-600 px-10 py-4 font-medium text-white shadow-apple-lg hover:bg-primary-700 hover:-translate-y-0.5 hover:shadow-apple-xl active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 transition-all duration-[180ms]"
          >
            {t("landing.hero.cta")}
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="relative bg-neutral-50 px-4 py-20 md:py-24">
        <div className="mx-auto grid max-w-4xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ key, icon }) => (
            <div
              key={key}
              className="rounded-[18px] bg-white p-6 text-center shadow-apple-md hover:-translate-y-1.5 hover:shadow-apple-lg transition-all duration-[300ms]"
            >
              <div className="mb-3 text-3xl">{ICON_MAP[icon]}</div>
              <h2 className="font-semibold text-neutral-900 tracking-[-0.01em]">
                {t(`landing.features.${key}.title`)}
              </h2>
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
          <p className="text-sm text-neutral-500">
            &copy; 2026 {t("landing.footer.copyright")}
          </p>
        </div>
      </footer>
    </div>
  );
}
