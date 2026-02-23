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
  LogOut,
} from "lucide-react";
import { useRouter } from "next/navigation";
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
  const { user, logout } = useAuthContext();
  const router = useRouter();

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
        "hidden lg:flex flex-col w-60 shrink-0",
        "h-[calc(100vh-64px)] sticky top-16 overflow-y-auto",
        "bg-white dark:bg-[#1C1C1E]",
        "border-e border-[#E2E8F0] dark:border-white/8"
      )}
    >
      {/* Profile mini-card */}
      <div className="p-4 border-b border-[#E2E8F0] dark:border-white/8">
        <Link
          href="/profile"
          className="flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#57BBCE] rounded-xl p-1"
        >
          <UserAvatar displayName={user?.displayName || "User"} size="md" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#0F172A] dark:text-[#F1F5F9] truncate">
              {user?.displayName || "User"}
            </p>
            <p className="text-xs text-[#64748B] dark:text-[#CBD5E1] truncate">
              {t("nav.roleLabel")}
            </p>
          </div>
        </Link>
        <div className="mt-2 flex items-center gap-4 text-xs text-[#64748B] dark:text-[#CBD5E1]">
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
                "flex items-center gap-3 px-4 py-2.5 mx-2 rounded-xl",
                "text-sm transition-all duration-[180ms]",
                isActive
                  ? "bg-[#E6F4F8] dark:bg-[#0B6E7F]/20 text-[#086577] dark:text-[#5DD4E8] font-medium"
                  : "text-[#475569] dark:text-[#CBD5E1] hover:bg-[#F8FAFC] dark:hover:bg-white/5 hover:text-[#0C9AB8] hover:ps-5",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#57BBCE]"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <item.icon
                className={cn(
                  "h-5 w-5",
                  isActive
                    ? "text-[#0B6E7F] dark:text-[#5DD4E8]"
                    : "text-[#64748B] dark:text-[#94A3B8]"
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
      <div className="mt-auto p-4 border-t border-[#E2E8F0] dark:border-white/8 space-y-3">
        {/* Sign out */}
        <button
          type="button"
          onClick={async () => {
            await logout();
            router.push("/login");
          }}
          className={cn(
            "flex items-center gap-3 px-4 py-2.5 mx-2 rounded-xl w-full",
            "text-sm text-[#EF4444] hover:bg-red-50 dark:hover:bg-red-900/20",
            "transition-all duration-[180ms]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          )}
        >
          <LogOut className="h-5 w-5" aria-hidden="true" />
          <span>{t("nav.signOut")}</span>
        </button>

        <div className="text-xs text-[#94A3B8] dark:text-[#CBD5E1] space-y-1">
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
