"use client";

import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Home,
  Users,
  Briefcase,
  MessageCircle,
  Bell,
} from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { useAuthContext } from "@/providers/AuthProvider";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationsPanel } from "@/components/notifications/NotificationsPanel";
import { cn } from "@/lib/utils";

interface TopBarProps {
  variant?: "authenticated" | "unauthenticated";
}

/**
 * Top navigation bar.
 * - Authenticated: logo, search, nav icons, avatar, language toggle
 * - Unauthenticated: logo, nav links, language toggle
 */
export function TopBar({ variant = "authenticated" }: TopBarProps) {
  const { t } = useTranslation();
  const { user } = useAuthContext();

  // Hook must be called unconditionally (Rules of Hooks)
  const {
    notifications,
    unreadCount,
    isLoading: notifLoading,
    isOpen: notifOpen,
    openPanel,
    closePanel,
    markRead,
    markAllRead,
  } = useNotifications();

  if (variant === "unauthenticated") {
    return (
      <header className="sticky top-0 z-20 h-16 glass-light dark:glass-dark border-b border-[#E2E8F0]/60 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <Link href="/" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#57BBCE] rounded">
            <Logo size="md" />
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className={cn(
                "text-sm font-medium text-[#0B6E7F] hover:text-[#086577]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#57BBCE] rounded px-2 py-1"
              )}
            >
              {t("landing.hero.login")}
            </Link>
            <Link
              href="/register"
              className={cn(
                "text-sm font-medium px-5 py-2 rounded-full",
                "bg-[#0B6E7F] text-white hover:bg-[#086577]",
                "shadow-apple-sm hover:shadow-apple-md",
                "hover:-translate-y-0.5 active:scale-[0.97]",
                "transition-all duration-[180ms]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#57BBCE] focus-visible:ring-offset-2"
              )}
            >
              {t("register.submit", { ns: "auth" })}
            </Link>
            <LanguageToggle />
          </div>
        </div>
      </header>
    );
  }

  const router = useRouter();
  const [searchValue, setSearchValue] = useState("");

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = searchValue.trim();
      if (trimmed) {
        router.push(`/search?q=${encodeURIComponent(trimmed)}`);
      }
    },
    [searchValue, router]
  );

  const navItems = [
    { href: "/feed", icon: Home, label: t("nav.home") },
    { href: "/network", icon: Users, label: t("nav.network") },
    { href: "/jobs", icon: Briefcase, label: t("nav.jobs") },
    { href: "/messages", icon: MessageCircle, label: t("nav.messages") },
  ];

  return (
    <header className="sticky top-0 z-20 h-16 glass-light dark:glass-dark border-b border-[#E2E8F0]/60 dark:border-white/10">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center gap-4">
        <Link href="/feed" className="shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#57BBCE] rounded">
          <Logo size="sm" />
        </Link>

        {/* Search bar */}
        <form
          onSubmit={handleSearchSubmit}
          className="relative flex-1 max-w-[360px] hidden sm:block"
          role="search"
        >
          <Search
            className="absolute inset-y-0 start-0 flex items-center ps-3 h-full w-4 text-[#94A3B8] pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder={t("nav.search")}
            className={cn(
              "w-full h-10 ps-10 pe-4",
              "bg-[#F1F5F9] dark:bg-[#334155]",
              "border border-transparent rounded-full",
              "text-sm text-[#0F172A] dark:text-[#F1F5F9]",
              "placeholder:text-[#64748B]",
              "focus:border-[#0C9AB8] focus:bg-white dark:focus:bg-[#1E293B]",
              "focus:outline-none transition-colors duration-100"
            )}
            aria-label={t("nav.search")}
          />
        </form>

        {/* Nav icons - desktop */}
        <nav
          className="hidden md:flex items-center gap-1 ms-auto"
          aria-label="Main navigation"
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl",
                "text-[#64748B] dark:text-[#CBD5E1]",
                "hover:text-[#0C9AB8] hover:-translate-y-0.5 hover:bg-black/5 dark:hover:bg-white/5",
                "transition-all duration-[180ms]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#57BBCE]"
              )}
              aria-label={item.label}
            >
              <item.icon className="h-5 w-5" aria-hidden="true" />
              <span className="text-xs hidden lg:block">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Notification bell */}
        <div className="relative">
          <button
            type="button"
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
            onClick={notifOpen ? closePanel : openPanel}
            className={cn(
              "w-11 h-11 flex items-center justify-center rounded-xl",
              "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300",
              "hover:bg-[#F1F5F9] dark:hover:bg-white/5 transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#57BBCE]",
              notifOpen && "bg-[#EBF9FC] dark:bg-[#57BBCE]/10"
            )}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span
                className="absolute top-1.5 end-1.5 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center"
                aria-hidden="true"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <NotificationsPanel
              notifications={notifications}
              isLoading={notifLoading}
              unreadCount={unreadCount}
              onClose={closePanel}
              onMarkRead={markRead}
              onMarkAllRead={markAllRead}
            />
          )}
        </div>

        {/* Avatar */}
        <Link
          href="/profile"
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#57BBCE] rounded-full"
        >
          <UserAvatar displayName={user?.displayName || "User"} size="sm" />
        </Link>

        <LanguageToggle />
      </div>
    </header>
  );
}
