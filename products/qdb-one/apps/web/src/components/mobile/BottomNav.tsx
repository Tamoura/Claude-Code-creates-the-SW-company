'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { getUnreadCount } from '@/data/notifications';

interface Tab {
  icon: string;
  route: string;
  labelEn: string;
  labelAr: string;
  match: (path: string) => boolean;
}

const tabs: Tab[] = [
  { icon: '\u229E', route: '/m', labelEn: 'Home', labelAr: '\u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629', match: (p) => p === '/m' },
  { icon: '\u25C8', route: '/m/financing', labelEn: 'Financing', labelAr: '\u0627\u0644\u062A\u0645\u0648\u064A\u0644', match: (p) => p.startsWith('/m/financing') },
  { icon: '\u25C9', route: '/m/guarantees', labelEn: 'Guarantees', labelAr: '\u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062A', match: (p) => p.startsWith('/m/guarantees') },
  { icon: '\u25CE', route: '/m/advisory', labelEn: 'Advisory', labelAr: '\u0627\u0644\u0627\u0633\u062A\u0634\u0627\u0631\u0627\u062A', match: (p) => p.startsWith('/m/advisory') },
  { icon: '\u22EF', route: '/m/profile', labelEn: 'More', labelAr: '\u0627\u0644\u0645\u0632\u064A\u062F', match: (p) => p.startsWith('/m/profile') || p.startsWith('/m/documents') || p.startsWith('/m/notifications') || p.startsWith('/m/search') || p.startsWith('/m/admin') },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { user } = useAuth();

  const unreadCount = user ? getUnreadCount(user.personId) : 0;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--card-bg)] border-t border-[var(--border)] mobile-safe-bottom">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const isActive = tab.match(pathname);
          return (
            <Link
              key={tab.route}
              href={tab.route}
              className={`flex flex-col items-center justify-center flex-1 h-full relative transition-colors ${
                isActive ? 'text-[var(--primary)]' : 'text-[var(--muted)]'
              }`}
            >
              <span className={`text-xl ${isActive ? 'font-bold' : ''}`}>{tab.icon}</span>
              <span className="text-[10px] mt-1 font-medium">{t(tab.labelEn, tab.labelAr)}</span>
              {tab.labelEn === 'More' && unreadCount > 0 && (
                <span className="absolute top-2 right-1/2 translate-x-4 w-4 h-4 bg-[var(--danger)] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
