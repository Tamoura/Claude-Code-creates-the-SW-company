'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/Button';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/catalog', label: 'Catalog', icon: '📚' },
  { href: '/subjects', label: 'My Plan', icon: '🎯' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <ul className="space-y-1">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500',
                active
                  ? 'bg-sage-50 text-sage-700 ring-1 ring-inset ring-sage-100'
                  : 'text-slate-600 hover:bg-sage-50/60 hover:text-sage-700'
              )}
            >
              <span aria-hidden className="text-base">
                {item.icon}
              </span>
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2">
      <span
        aria-hidden
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-sage-600 text-lg font-bold text-white"
      >
        S
      </span>
      <span className="font-display text-lg font-bold tracking-tight text-slate-900">
        StudyFlow
      </span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { student, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#fafbfb]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow"
      >
        Skip to content
      </a>

      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white px-4 py-6 lg:flex">
        <div className="px-2">
          <Brand />
        </div>
        <nav aria-label="Primary" className="mt-8 flex-1">
          <NavLinks pathname={pathname} />
        </nav>
        <div className="mt-auto border-t border-slate-100 pt-4">
          <p className="truncate px-2 text-xs text-slate-500" title={student?.email}>
            {student?.email}
          </p>
          <p className="px-2 text-xs text-slate-400">
            Term {student?.activeTerm ?? '—'}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full justify-start"
            onClick={() => void logout()}
          >
            Sign out
          </Button>
        </div>
      </aside>

      {/* Top bar (mobile) */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <Brand />
        <button
          type="button"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
          className="rounded-lg p-2 text-slate-600 hover:bg-sage-50 hover:text-sage-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500"
        >
          <span aria-hidden className="text-xl">
            {mobileOpen ? '✕' : '☰'}
          </span>
        </button>
      </header>

      {mobileOpen && (
        <div className="border-b border-slate-200 bg-white px-4 py-4 lg:hidden">
          <nav aria-label="Primary mobile">
            <NavLinks pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          </nav>
          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-500">{student?.email}</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => void logout()}
            >
              Sign out
            </Button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="lg:pl-64">
        <main
          id="main-content"
          className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
