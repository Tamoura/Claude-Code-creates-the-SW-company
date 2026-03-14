"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SETTINGS_TABS = [
  { label: "Profile", href: "/settings/profile" },
  { label: "Account", href: "/settings/account" },
  { label: "Preferences", href: "/settings/preferences" },
] as const;

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your profile, account, and advisory preferences.
        </p>
      </div>

      <nav aria-label="Settings" className="mb-8">
        <ul className="flex border-b border-border" role="tablist">
          {SETTINGS_TABS.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <li key={tab.href} role="presentation">
                <Link
                  href={tab.href}
                  role="tab"
                  aria-current={isActive ? "page" : undefined}
                  aria-selected={isActive}
                  className={`inline-block px-4 py-3 text-sm font-medium border-b-2 transition-colors min-h-[48px] flex items-center ${
                    isActive
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300"
                  }`}
                >
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div>{children}</div>
    </div>
  );
}
