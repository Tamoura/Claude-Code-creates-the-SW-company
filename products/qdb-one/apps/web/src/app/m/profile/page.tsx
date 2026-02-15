'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getUnreadCount } from '@/data/notifications';
import MobileHeader from '@/components/mobile/MobileHeader';
import MobileCard from '@/components/mobile/MobileCard';
import MobileActionSheet from '@/components/mobile/MobileActionSheet';

export default function MobileProfilePage() {
  const { user, activeOrg, logout, switchOrg } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const router = useRouter();
  const [showOrgSwitcher, setShowOrgSwitcher] = useState(false);

  if (!user || !activeOrg) return null;

  const unreadCount = getUnreadCount(user.personId);

  const orgActions = user.personas.map(p => ({
    label: t(p.orgNameEn, p.orgNameAr),
    icon: p.orgId === user.activeOrgId ? '\u2713' : undefined,
    onClick: () => switchOrg(p.orgId),
  }));

  return (
    <div>
      <MobileHeader title={t('More', '\u0627\u0644\u0645\u0632\u064A\u062F')} />
      <div className="px-4 py-4 space-y-4">
        {/* Profile card */}
        <MobileCard>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-bold text-lg">
              {user.fullNameEn.charAt(0)}
            </div>
            <div>
              <div className="text-sm font-semibold">{t(user.fullNameEn, user.fullNameAr)}</div>
              <div className="text-xs text-[var(--muted)]">{user.email}</div>
              <div className="text-[10px] text-[var(--muted)]">QID: {user.qid}</div>
            </div>
          </div>
        </MobileCard>

        {/* Active Organization */}
        <MobileCard onClick={() => setShowOrgSwitcher(true)}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] text-[var(--muted)]">{t('Active Organization', '\u0627\u0644\u0645\u0624\u0633\u0633\u0629 \u0627\u0644\u0646\u0634\u0637\u0629')}</div>
              <div className="text-sm font-medium">{t(activeOrg.orgNameEn, activeOrg.orgNameAr)}</div>
              <div className="text-[10px] text-[var(--muted)]">CR: {activeOrg.crNumber}</div>
            </div>
            <span className="text-[var(--muted)] text-lg">\u21C5</span>
          </div>
        </MobileCard>

        {/* Roles */}
        <MobileCard>
          <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">{t('Roles', '\u0627\u0644\u0623\u062F\u0648\u0627\u0631')}</h3>
          <div className="space-y-1.5">
            {activeOrg.roles.map((role, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs font-medium text-[var(--foreground)]">{role.portal}</span>
                <span className="text-[10px] text-[var(--muted)]">\u00B7</span>
                <span className="text-xs text-[var(--muted)]">{role.role}</span>
              </div>
            ))}
          </div>
        </MobileCard>

        {/* Navigation Links */}
        <div className="space-y-1">
          <Link href="/m/documents" className="flex items-center justify-between px-4 py-3 bg-[var(--card-bg)] rounded-xl border border-[var(--border)] active:bg-gray-50">
            <div className="flex items-center gap-3">
              <span>{'\u{1F4C4}'}</span>
              <span className="text-sm font-medium">{t('Documents', '\u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A')}</span>
            </div>
            <span className="text-[var(--muted)]">{'\u203A'}</span>
          </Link>

          <Link href="/m/notifications" className="flex items-center justify-between px-4 py-3 bg-[var(--card-bg)] rounded-xl border border-[var(--border)] active:bg-gray-50">
            <div className="flex items-center gap-3">
              <span>{'\u{1F514}'}</span>
              <span className="text-sm font-medium">{t('Notifications', '\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A')}</span>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-[var(--danger)] text-white text-[10px] font-bold rounded-full">{unreadCount}</span>
              )}
              <span className="text-[var(--muted)]">{'\u203A'}</span>
            </div>
          </Link>

          <Link href="/m/search" className="flex items-center justify-between px-4 py-3 bg-[var(--card-bg)] rounded-xl border border-[var(--border)] active:bg-gray-50">
            <div className="flex items-center gap-3">
              <span>{'\u{1F50D}'}</span>
              <span className="text-sm font-medium">{t('Search', '\u0627\u0644\u0628\u062D\u062B')}</span>
            </div>
            <span className="text-[var(--muted)]">{'\u203A'}</span>
          </Link>

          <Link href="/m/admin/identity/review" className="flex items-center justify-between px-4 py-3 bg-[var(--card-bg)] rounded-xl border border-[var(--border)] active:bg-gray-50">
            <div className="flex items-center gap-3">
              <span>{'\u{1F6E1}'}</span>
              <span className="text-sm font-medium">{t('Admin: Identity Review', '\u0627\u0644\u0625\u062F\u0627\u0631\u0629: \u0645\u0631\u0627\u062C\u0639\u0629 \u0627\u0644\u0647\u0648\u064A\u0629')}</span>
            </div>
            <span className="text-[var(--muted)]">{'\u203A'}</span>
          </Link>
        </div>

        {/* Language Toggle */}
        <MobileCard onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span>{'\u{1F310}'}</span>
              <span className="text-sm font-medium">{t('Language', '\u0627\u0644\u0644\u063A\u0629')}</span>
            </div>
            <span className="text-sm text-[var(--primary)] font-medium">{lang === 'en' ? '\u0639\u0631\u0628\u064A' : 'English'}</span>
          </div>
        </MobileCard>

        {/* Sign Out */}
        <button
          onClick={() => { logout(); router.push('/m'); }}
          className="w-full py-3 bg-[var(--danger)]/10 text-[var(--danger)] rounded-xl text-sm font-medium"
        >
          {t('Sign Out', '\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062E\u0631\u0648\u062C')}
        </button>
      </div>

      <MobileActionSheet
        isOpen={showOrgSwitcher}
        onClose={() => setShowOrgSwitcher(false)}
        title={t('Switch Organization', '\u062A\u0628\u062F\u064A\u0644 \u0627\u0644\u0645\u0624\u0633\u0633\u0629')}
        actions={orgActions}
      />
    </div>
  );
}
