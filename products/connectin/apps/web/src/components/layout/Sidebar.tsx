"use client";

import { useTranslation } from "react-i18next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  Briefcase,
  MessageCircle,
  Bookmark,
  Settings,
} from "lucide-react";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { useAuthContext } from "@/providers/AuthProvider";
import { cn } from "@/lib/utils";

/**
 * Left sidebar navigation for desktop layout.
 * Shows profile mini-card and navigation links.
 * Hidden on mobile (replaced by BottomNav).
 */
export function Sidebar() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const { user } = useAuthContext();

  const navItems = [
    { href: "/feed", icon: Home, label: t("nav.home") },
    { href: "/network", icon: Users, label: t("nav.network"), badge: 3 },
    { href: "/jobs", icon: Briefcase, label: t("nav.jobs") },
    {
      href: "/messages",
      icon: MessageCircle,
      label: t("nav.messages"),
      badge: 2,
    },
    { href: "/saved", icon: Bookmark, label: t("nav.saved") },
    { href: "/settings", icon: Settings, label: t("nav.settings") },
  ];

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col w-[280px] shrink-0",
        "h-[calc(100vh-64px)] sticky top-16 overflow-y-auto",
        "bg-white dark:bg-[#1E293B]",
        "border-e border-[#E2E8F0] dark:border-[#334155]"
      )}
    >
      {/* Profile mini-card */}
      <div className="p-4 border-b border-[#E2E8F0] dark:border-[#334155]">
        <Link
          href="/profile"
          className="flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-[#57BBCE] rounded-md p-1"
        >
          <UserAvatar displayName={user?.displayName || "User"} size="md" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F1F5F9] truncate">
              {user?.displayName || "User"}
            </p>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] truncate">
              Professional
            </p>
          </div>
        </Link>
        <div className="mt-2 flex items-center gap-4 text-xs text-[#64748B] dark:text-[#94A3B8]">
          <span>0 {t("profile.connections")}</span>
        </div>
      </div>

      {/* Navigation links */}
      <nav className="flex flex-col py-2" aria-label="Sidebar navigation">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 mx-2 rounded-md",
                "text-sm transition-colors duration-100",
                isActive
                  ? "bg-[#E6F4F8] text-[#086577] font-medium border-s-[3px] border-[#0C9AB8]"
                  : "text-[#475569] dark:text-[#94A3B8] hover:bg-[#F8FAFC] dark:hover:bg-[#334155] hover:text-[#0C9AB8]",
                "focus:outline-none focus:ring-2 focus:ring-[#57BBCE]"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <item.icon
                className={cn(
                  "h-5 w-5",
                  isActive
                    ? "text-[#0A7F99]"
                    : "text-[#94A3B8]"
                )}
                aria-hidden="true"
              />
              <span className="flex-1">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span
                  className={cn(
                    "ms-auto min-w-[20px] h-5 px-1.5",
                    "bg-[#EF4444] text-white",
                    "text-xs font-medium rounded-full",
                    "flex items-center justify-center"
                  )}
                  aria-label={`${item.badge} new ${item.label}`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mt-auto p-4 border-t border-[#E2E8F0] dark:border-[#334155]">
        <div className="text-xs text-[#94A3B8] dark:text-[#64748B] space-y-1">
          <div className="flex gap-2">
            <Link href="/about" className="hover:underline">
              {t("landing.footer.about")}
            </Link>
            <Link href="/privacy" className="hover:underline">
              {t("landing.footer.privacy")}
            </Link>
            <Link href="/terms" className="hover:underline">
              {t("landing.footer.terms")}
            </Link>
          </div>
          <p>&copy; 2026 {t("landing.footer.copyright")}</p>
        </div>
      </div>
    </aside>
  );
}
