"use client";

import { useTranslation } from "react-i18next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Briefcase, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Bottom navigation bar for mobile viewports.
 * Visible below the `lg` breakpoint, hidden on desktop (where Sidebar is used).
 * Contains the 5 core navigation destinations: Home, Network, Jobs, Messages, Profile.
 */
export function BottomNav() {
  const { t } = useTranslation();
  const pathname = usePathname();

  const navItems = [
    { href: "/feed", icon: Home, label: t("nav.home") },
    { href: "/network", icon: Users, label: t("nav.network") },
    { href: "/jobs", icon: Briefcase, label: t("nav.jobs") },
    { href: "/messages", icon: MessageCircle, label: t("nav.messages") },
    { href: "/profile", icon: User, label: t("nav.profile") },
  ];

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-20 lg:hidden",
        "flex items-center justify-around",
        "h-14 border-t border-neutral-200 dark:border-neutral-700 bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-xl",
        "safe-area-pb"
      )}
      aria-label="Mobile navigation"
    >
      {navItems.map((item) => {
        const isActive =
          pathname === item.href ||
          pathname?.startsWith(item.href + "/");

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "relative flex flex-col items-center justify-center gap-0.5",
              "min-w-[48px] min-h-[48px] px-2 py-1 rounded-xl",
              "text-xs transition-all duration-[180ms]",
              "active:scale-90",
              isActive
                ? "text-[#0B6E7F] dark:text-[#5DD4E8] font-medium"
                : "text-[#64748B] dark:text-[#94A3B8]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#57BBCE]"
            )}
            aria-current={isActive ? "page" : undefined}
            aria-label={item.label}
          >
            {isActive && (
              <span className="absolute top-0 inset-x-3 h-1 rounded-full bg-[#0C9AB8]" aria-hidden="true" />
            )}
            <item.icon
              className={cn(
                "h-5 w-5",
                isActive
                  ? "text-[#0B6E7F] dark:text-[#5DD4E8]"
                  : "text-[#64748B] dark:text-[#94A3B8]"
              )}
              aria-hidden="true"
            />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
