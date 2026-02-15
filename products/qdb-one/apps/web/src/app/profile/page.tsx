'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ProfilePage() {
  const { user } = useAuth();
  const { t } = useLanguage();

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          {t('Profile', 'الملف الشخصي')}
        </h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          {t('Personal information and organizations', 'المعلومات الشخصية والمؤسسات')}
        </p>
      </div>

      {/* Personal Information */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)]">
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <h2 className="font-semibold text-[var(--foreground)]">
            {t('Personal Information', 'المعلومات الشخصية')}
          </h2>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-1">
              {t('Full Name', 'الاسم الكامل')}
            </label>
            <div className="text-sm font-medium text-[var(--foreground)]">
              {t(user.fullNameEn, user.fullNameAr)}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-1">
              {t('Qatar ID', 'الرقم الشخصي')}
            </label>
            <div className="text-sm font-medium text-[var(--foreground)]">{user.qid}</div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-1">
              {t('Email', 'البريد الإلكتروني')}
            </label>
            <div className="text-sm font-medium text-[var(--foreground)]">{user.email}</div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-1">
              {t('Person ID', 'رقم الشخص')}
            </label>
            <div className="text-sm font-mono text-[var(--muted)]">{user.personId}</div>
          </div>
        </div>
      </div>

      {/* Organizations */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)]">
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <h2 className="font-semibold text-[var(--foreground)]">
            {t('Organizations & Roles', 'المؤسسات والأدوار')}
          </h2>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {user.personas.map((org) => {
            const isActive = org.orgId === user.activeOrgId;
            return (
              <div
                key={org.orgId}
                className={`px-5 py-4 ${isActive ? 'bg-[var(--primary)]/5' : ''}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium text-[var(--foreground)]">
                        {t(org.orgNameEn, org.orgNameAr)}
                      </div>
                      {isActive && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--primary)]/10 text-[var(--primary)]">
                          {t('Active', 'نشط')}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[var(--muted)] mt-1">
                      {t('CR Number:', 'رقم السجل التجاري:')} {org.crNumber}
                    </div>
                  </div>
                </div>

                {/* Roles */}
                <div className="mt-3 space-y-2">
                  {org.roles.map((role, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor:
                            role.portal === 'financing'
                              ? 'var(--primary)/10'
                              : role.portal === 'guarantee'
                              ? 'var(--warning)/10'
                              : 'var(--success)/10',
                          color:
                            role.portal === 'financing'
                              ? 'var(--primary)'
                              : role.portal === 'guarantee'
                              ? 'var(--warning)'
                              : 'var(--success)',
                        }}
                      >
                        {t(
                          role.portal.charAt(0).toUpperCase() + role.portal.slice(1),
                          role.portal === 'financing'
                            ? 'التمويل'
                            : role.portal === 'guarantee'
                            ? 'الضمانات'
                            : 'الاستشارات'
                        )}
                      </span>
                      <span className="text-xs text-[var(--muted)]">·</span>
                      <span className="text-xs font-medium text-[var(--foreground)]">{role.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
