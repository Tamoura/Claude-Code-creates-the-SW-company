"use client";

import { Logo } from "@/components/shared/Logo";
import { LanguageToggle } from "@/components/layout/LanguageToggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-[#E6F4F8] via-[#F8FAFC] to-[#FFF8E6]">
      <header className="flex items-center justify-between px-6 py-4 backdrop-blur-md bg-white/60">
        <Logo size="md" />
        <LanguageToggle />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
