'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { t } from '@/lib/i18n';

interface SidebarItem {
  href: string;
  label: string;
  icon: string;
}

const sidebarItems: SidebarItem[] = [
  { href: '/dashboard', label: t('nav.dashboard'), icon: '▤' },
  { href: '/assessment', label: t('nav.assessment'), icon: '◎' },
  { href: '/profile', label: t('nav.profile'), icon: '◉' },
  { href: '/learning', label: t('nav.learning'), icon: '◈' },
  { href: '/settings/profile', label: t('nav.settings'), icon: '⚙' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-56 shrink-0 border-r border-gray-200 bg-white"
      aria-label="Sidebar navigation"
    >
      <nav className="flex flex-col gap-1 p-4">
        <ul role="list" className="flex flex-col gap-1">
          {sidebarItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={[
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2',
                    'min-h-[48px]',
                    isActive
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                  ].join(' ')}
                >
                  <span aria-hidden="true" className="text-base">
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
