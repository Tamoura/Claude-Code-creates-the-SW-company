'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';

const navItems = [
  { href: '/dashboard', labelEn: 'Dashboard', labelAr: 'لوحة التحكم', icon: '⊞' },
  { href: '/financing', labelEn: 'Financing', labelAr: 'التمويل', icon: '◈' },
  { href: '/guarantees', labelEn: 'Guarantees', labelAr: 'الضمانات', icon: '◉' },
  { href: '/advisory', labelEn: 'Advisory', labelAr: 'الاستشارات', icon: '◎' },
  { href: '/documents', labelEn: 'Documents', labelAr: 'المستندات', icon: '▤' },
  { href: '/profile', labelEn: 'Profile', labelAr: 'الملف الشخصي', icon: '○' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { t } = useLanguage();

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-[var(--sidebar-bg)] text-[var(--sidebar-text)]
          transform transition-transform duration-200 ease-in-out
          lg:translate-x-0 lg:static lg:z-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          rtl:left-auto rtl:right-0 rtl:translate-x-full rtl:lg:translate-x-0
          ${isOpen ? 'rtl:translate-x-0' : ''}`}
      >
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
          <div className="w-10 h-10 rounded-lg bg-[var(--accent)] flex items-center justify-center text-[var(--primary)] font-bold text-lg">
            Q
          </div>
          <div>
            <div className="font-semibold text-white text-lg">QDB One</div>
            <div className="text-xs text-[var(--sidebar-text)]/60">
              {t('Qatar Development Bank', 'بنك قطر للتنمية')}
            </div>
          </div>
        </div>

        <nav className="mt-4 px-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors text-sm
                ${isActive(item.href)
                  ? 'bg-[var(--sidebar-active)] text-white font-medium'
                  : 'text-[var(--sidebar-text)]/80 hover:bg-white/5 hover:text-white'
                }`}
            >
              <span className="text-lg w-6 text-center">{item.icon}</span>
              <span>{t(item.labelEn, item.labelAr)}</span>
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
          <Link
            href="/admin/identity/review"
            onClick={onClose}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm
              ${pathname.startsWith('/admin')
                ? 'bg-[var(--sidebar-active)] text-white font-medium'
                : 'text-[var(--sidebar-text)]/80 hover:bg-white/5 hover:text-white'
              }`}
          >
            <span className="text-lg w-6 text-center">⚙</span>
            <span>{t('Admin', 'الإدارة')}</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
