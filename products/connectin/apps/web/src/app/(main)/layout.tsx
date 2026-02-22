"use client";

import dynamic from "next/dynamic";
import { AuthGate } from "@/components/layout/AuthGate";

/**
 * Skeleton shown while TopBar JS bundle loads.
 * Matches the 64px fixed height of the real TopBar so layout does not shift.
 */
function TopBarSkeleton() {
  return (
    <div
      className="sticky top-0 z-20 h-16 w-full backdrop-blur-xl bg-white/80 dark:bg-[#1C1C1E]/80"
      aria-hidden="true"
    />
  );
}

/**
 * Skeleton shown while Sidebar JS bundle loads.
 * Matches the 280px width of the real Sidebar to prevent layout shift.
 */
function SidebarSkeleton() {
  return (
    <div
      className="hidden h-[calc(100vh-64px)] w-[280px] shrink-0 animate-pulse rounded-[18px] bg-neutral-100 dark:bg-[#1C1C1E] lg:block"
      aria-hidden="true"
    />
  );
}

/**
 * Dynamically imported TopBar — defers icon library, i18n, and auth-context
 * JS from the initial page bundle. ssr:false is correct here because TopBar
 * reads from AuthContext (client-only) and uses useTranslation.
 */
const TopBar = dynamic(
  () => import("@/components/layout/TopBar").then((m) => m.TopBar),
  {
    ssr: false,
    loading: TopBarSkeleton,
  }
);

/**
 * Dynamically imported Sidebar — defers usePathname, i18n, and auth-context
 * JS from the initial page bundle. Only visible on lg+ screens so this also
 * avoids loading it entirely on mobile.
 */
const Sidebar = dynamic(
  () => import("@/components/layout/Sidebar").then((m) => m.Sidebar),
  {
    ssr: false,
    loading: SidebarSkeleton,
  }
);

/**
 * Dynamically imported BottomNav — mobile navigation bar shown below the lg
 * breakpoint. Hidden on desktop where the Sidebar is used instead.
 */
const BottomNav = dynamic(
  () => import("@/components/layout/BottomNav").then((m) => m.BottomNav),
  { ssr: false }
);

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <TopBar />
      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6 pb-[72px] lg:pb-6">
        <aside className="hidden w-60 shrink-0 lg:block">
          <Sidebar />
        </aside>
        <main className="min-w-0 flex-1" style={{ animation: "fadeUp 0.5s ease-out both" }}>
          <AuthGate>{children}</AuthGate>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
