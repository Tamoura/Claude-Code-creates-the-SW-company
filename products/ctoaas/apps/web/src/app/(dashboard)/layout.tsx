'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Brain,
  LayoutDashboard,
  MessageSquare,
  Shield,
  DollarSign,
  Radar,
  Settings,
  FileText,
  Bell,
  Search,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Advisory Chat', href: '/chat', icon: MessageSquare },
  { name: 'Risks', href: '/risks', icon: Shield },
  { name: 'Costs', href: '/costs', icon: DollarSign },
  { name: 'Tech Radar', href: '/radar', icon: Radar },
  { name: 'ADRs', href: '/adrs', icon: FileText },
];

const bottomNav = [
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[35] bg-slate-900/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
              <Brain className="h-4 w-4" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-slate-900">
              CTOaaS
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-[8px] p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'group flex items-center gap-3 rounded-[8px] px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'border-l-[3px] border-brand bg-brand-light font-medium text-brand'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  )}
                >
                  <item.icon
                    className={cn(
                      'h-5 w-5 shrink-0',
                      isActive
                        ? 'text-brand'
                        : 'text-slate-400 group-hover:text-slate-600'
                    )}
                  />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Bottom nav */}
        <div className="border-t border-slate-200 p-3">
          {bottomNav.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-[8px] px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-brand-light font-medium text-brand'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <item.icon className="h-5 w-5 text-slate-400" />
                {item.name}
              </Link>
            );
          })}
          {/* User */}
          <div className="mt-2 flex items-center gap-3 rounded-[8px] px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-light text-xs font-semibold text-brand">
              AC
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">Alex Chen</p>
              <p className="truncate text-xs text-slate-500">CTO, TechCorp</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-[8px] p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden items-center gap-2 rounded-[8px] border border-slate-200 bg-white px-3 py-1.5 sm:flex">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                className="w-48 border-0 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                /
              </kbd>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative rounded-[8px] p-2 text-slate-400 hover:bg-slate-100">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-brand" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[80rem] px-6 py-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 flex border-t border-slate-200 bg-white lg:hidden">
        {[
          { name: 'Home', href: '/dashboard', icon: LayoutDashboard },
          { name: 'Chat', href: '/chat', icon: MessageSquare },
          { name: 'Risks', href: '/risks', icon: Shield },
          { name: 'Costs', href: '/costs', icon: DollarSign },
          { name: 'More', href: '/settings', icon: Menu },
        ].map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-2',
                isActive ? 'text-brand' : 'text-slate-400'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
