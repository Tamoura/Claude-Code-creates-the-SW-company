'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface HeaderProps {
  onMenuToggle: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const { user, logout, switchOrg, activeOrg } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const unreadCount = 3; // mock

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[var(--border)] px-4 lg:px-6 h-16 flex items-center gap-4">
      <button
        onClick={onMenuToggle}
        className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
        aria-label="Toggle menu"
      >
        <span className="text-xl">☰</span>
      </button>

      {/* Search */}
      <div className="flex-1 max-w-xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (searchQuery.trim()) {
              window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
            }
          }}
        >
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('Search across all services...', 'البحث في جميع الخدمات...')}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--border)] bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
            />
          </div>
        </form>
      </div>

      {/* Language toggle */}
      <button
        onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
        className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm font-medium hover:bg-gray-50 transition-colors"
      >
        {lang === 'en' ? 'عربي' : 'EN'}
      </button>

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => { setShowNotifications(!showNotifications); setShowOrgDropdown(false); }}
          className="relative p-2 rounded-lg hover:bg-gray-100"
        >
          <span className="text-xl">🔔</span>
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-[var(--danger)] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
        {showNotifications && (
          <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-lg border border-[var(--border)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
              <span className="font-semibold text-sm">{t('Notifications', 'الإشعارات')}</span>
              <button className="text-xs text-[var(--primary)]">{t('Mark all read', 'تحديد الكل كمقروء')}</button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              <Link href="/guarantees/GR-2024-789/sign" onClick={() => setShowNotifications(false)} className="block px-4 py-3 hover:bg-gray-50 border-b border-[var(--border)]">
                <div className="flex items-start gap-2">
                  <span className="text-[var(--warning)] text-sm mt-0.5">●</span>
                  <div>
                    <p className="text-sm font-medium">{t('Guarantee GR-2024-789 requires your signature', 'الضمان GR-2024-789 يتطلب توقيعك')}</p>
                    <p className="text-xs text-[var(--muted)] mt-1">{t('2 hours ago', 'منذ ساعتين')} · {t('Guarantees', 'الضمانات')}</p>
                  </div>
                </div>
              </Link>
              <Link href="/financing/applications/LA-2025-038" onClick={() => setShowNotifications(false)} className="block px-4 py-3 hover:bg-gray-50 border-b border-[var(--border)]">
                <div className="flex items-start gap-2">
                  <span className="text-[var(--success)] text-sm mt-0.5">●</span>
                  <div>
                    <p className="text-sm font-medium">{t('Loan application LA-2025-038 approved!', 'تمت الموافقة على طلب التمويل LA-2025-038!')}</p>
                    <p className="text-xs text-[var(--muted)] mt-1">{t('1 day ago', 'منذ يوم واحد')} · {t('Financing', 'التمويل')}</p>
                  </div>
                </div>
              </Link>
              <Link href="/advisory/sessions/S-2025-101" onClick={() => setShowNotifications(false)} className="block px-4 py-3 hover:bg-gray-50">
                <div className="flex items-start gap-2">
                  <span className="text-[var(--muted)] text-sm mt-0.5">●</span>
                  <div>
                    <p className="text-sm text-[var(--muted)]">{t('Advisory session confirmed for March 1', 'تم تأكيد جلسة الاستشارات ليوم 1 مارس')}</p>
                    <p className="text-xs text-[var(--muted)] mt-1">{t('2 days ago', 'منذ يومين')} · {t('Advisory', 'الاستشارات')}</p>
                  </div>
                </div>
              </Link>
            </div>
            <Link href="/notifications" onClick={() => setShowNotifications(false)} className="block px-4 py-3 text-center text-sm text-[var(--primary)] font-medium border-t border-[var(--border)] hover:bg-gray-50">
              {t('View all notifications', 'عرض جميع الإشعارات')}
            </Link>
          </div>
        )}
      </div>

      {/* Persona / Company Switcher */}
      {user && (
        <div className="relative">
          <button
            onClick={() => { setShowOrgDropdown(!showOrgDropdown); setShowNotifications(false); }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 border border-[var(--border)]"
          >
            <div className="w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-sm font-medium">
              {user.fullNameEn.charAt(0)}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-sm font-medium">{t(user.fullNameEn, user.fullNameAr)}</div>
              {activeOrg && (
                <div className="text-xs text-[var(--muted)]">{t(activeOrg.orgNameEn, activeOrg.orgNameAr)}</div>
              )}
            </div>
            <span className="text-xs text-[var(--muted)]">▼</span>
          </button>
          {showOrgDropdown && (
            <div className="absolute right-0 top-14 w-72 bg-white rounded-xl shadow-lg border border-[var(--border)] overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--border)]">
                <div className="font-semibold text-sm">{t(user.fullNameEn, user.fullNameAr)}</div>
                <div className="text-xs text-[var(--muted)]">{user.email}</div>
              </div>
              <div className="py-2">
                <div className="px-4 py-1 text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
                  {t('Switch Company', 'تبديل الشركة')}
                </div>
                {user.personas.map((persona) => (
                  <button
                    key={persona.orgId}
                    onClick={() => { switchOrg(persona.orgId); setShowOrgDropdown(false); }}
                    className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3
                      ${persona.orgId === user.activeOrgId ? 'bg-[var(--primary)]/5' : ''}`}
                  >
                    <div className={`w-2 h-2 rounded-full ${persona.orgId === user.activeOrgId ? 'bg-[var(--primary)]' : 'bg-gray-300'}`} />
                    <div>
                      <div className="text-sm font-medium">{t(persona.orgNameEn, persona.orgNameAr)}</div>
                      <div className="text-xs text-[var(--muted)]">
                        CR: {persona.crNumber} · {persona.roles.map(r => t(r.role.replace('_', ' '), r.role)).join(', ')}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="border-t border-[var(--border)] py-2">
                <Link href="/profile/link-account" onClick={() => setShowOrgDropdown(false)} className="block px-4 py-2 text-sm hover:bg-gray-50">
                  {t('Link Another Account', 'ربط حساب آخر')}
                </Link>
                <Link href="/profile" onClick={() => setShowOrgDropdown(false)} className="block px-4 py-2 text-sm hover:bg-gray-50">
                  {t('Profile & Settings', 'الملف الشخصي والإعدادات')}
                </Link>
                <button onClick={() => { logout(); setShowOrgDropdown(false); }} className="w-full text-left px-4 py-2 text-sm text-[var(--danger)] hover:bg-gray-50">
                  {t('Sign Out', 'تسجيل الخروج')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
