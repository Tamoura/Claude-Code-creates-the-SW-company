"use client";

import dynamic from "next/dynamic";

/**
 * Skeleton shown while TopBar JS bundle loads.
 * Matches the 64px fixed height of the real TopBar so layout does not shift.
 */
function TopBarSkeleton() {
  return (
    <div
      className="sticky top-0 z-20 h-16 w-full border-b border-[#E2E8F0] bg-white dark:border-[#334155] dark:bg-[#1E293B]"
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
      className="hidden h-[calc(100vh-64px)] w-[280px] shrink-0 animate-pulse rounded-md bg-neutral-100 dark:bg-[#1E293B] lg:block"
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
      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6 pb-20 lg:pb-6">
        <aside className="hidden w-60 shrink-0 lg:block">
          <Sidebar />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
