'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { href: '/dashboard/tenants', label: 'Tenants', icon: 'B' },
  { href: '/dashboard/settings', label: 'Settings', icon: 'S' },
];

function getTenantNavItems(tenantId: string): NavItem[] {
  return [
    { href: `/dashboard/tenants/${tenantId}`, label: 'Overview', icon: 'O' },
    { href: `/dashboard/tenants/${tenantId}/analytics`, label: 'Analytics', icon: 'A' },
    { href: `/dashboard/tenants/${tenantId}/catalog`, label: 'Catalog', icon: 'C' },
    { href: `/dashboard/tenants/${tenantId}/events`, label: 'Events', icon: 'E' },
    { href: `/dashboard/tenants/${tenantId}/experiments`, label: 'Experiments', icon: 'X' },
    { href: `/dashboard/tenants/${tenantId}/widgets`, label: 'Widgets', icon: 'W' },
    { href: `/dashboard/tenants/${tenantId}/api-keys`, label: 'API Keys', icon: 'K' },
  ];
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // Extract tenant ID from path if present
  const tenantMatch = pathname.match(/\/dashboard\/tenants\/([^/]+)/);
  const tenantId = tenantMatch?.[1];
  const items = tenantId ? getTenantNavItems(tenantId) : navItems;

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 min-h-screen flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <Link href="/dashboard/tenants" className="text-xl font-bold text-blue-600">
          RecomEngine
        </Link>
      </div>

      {tenantId && (
        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <Link
            href="/dashboard/tenants"
            className="text-sm text-gray-500 hover:text-blue-600"
          >
            &larr; All Tenants
          </Link>
        </div>
      )}

      <nav className="flex-1 p-4 space-y-1">
        {items.map(item => {
          const isActive = pathname === item.href || (item.href !== '/dashboard/tenants' && pathname.startsWith(item.href + '/'));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <span className="w-6 h-6 flex items-center justify-center rounded bg-gray-200 dark:bg-gray-600 text-xs font-bold">
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-2 truncate">
          {user?.email}
        </div>
        <button
          onClick={logout}
          className="w-full text-left text-sm text-red-600 hover:text-red-700"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
