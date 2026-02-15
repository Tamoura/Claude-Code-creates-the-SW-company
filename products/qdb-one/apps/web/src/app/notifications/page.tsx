'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getNotificationsByPerson } from '@/data/notifications';

export default function NotificationsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();

  if (!user) return null;

  const notifications = getNotificationsByPerson(user.personId);

  const formatTime = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return t('Just now', 'الآن');
    if (diffMins < 60) return t(`${diffMins}m ago`, `منذ ${diffMins} د`);
    if (diffHours < 24) return t(`${diffHours}h ago`, `منذ ${diffHours} س`);
    if (diffDays < 7) return t(`${diffDays}d ago`, `منذ ${diffDays} ي`);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const portalColor: Record<string, string> = {
    financing: 'var(--primary)',
    guarantee: 'var(--warning)',
    advisory: 'var(--success)',
    system: 'var(--muted)',
  };

  const portalLabel: Record<string, { en: string; ar: string }> = {
    financing: { en: 'Financing', ar: 'التمويل' },
    guarantee: { en: 'Guarantees', ar: 'الضمانات' },
    advisory: { en: 'Advisory', ar: 'الاستشارات' },
    system: { en: 'System', ar: 'النظام' },
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          {t('Notifications', 'الإشعارات')}
        </h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          {t(`${notifications.length} total notifications`, `${notifications.length} إشعار إجمالي`)}
        </p>
      </div>

      {/* Notifications List */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)]">
        <div className="divide-y divide-[var(--border)]">
          {notifications.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-[var(--muted)]">
              {t('No notifications', 'لا توجد إشعارات')}
            </div>
          ) : (
            notifications.map((notif) => (
              <Link
                key={notif.id}
                href={notif.deepLink}
                className={`flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors ${
                  !notif.read ? 'border-l-4' : ''
                }`}
                style={
                  !notif.read
                    ? { borderLeftColor: portalColor[notif.sourcePortal] }
                    : undefined
                }
              >
                {/* Portal Badge */}
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs"
                  style={{ backgroundColor: portalColor[notif.sourcePortal] }}
                >
                  {notif.sourcePortal === 'financing'
                    ? '◈'
                    : notif.sourcePortal === 'guarantee'
                    ? '◉'
                    : notif.sourcePortal === 'advisory'
                    ? '◎'
                    : '⚙'}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3
                      className={`text-sm font-medium ${
                        !notif.read ? 'text-[var(--foreground)]' : 'text-[var(--muted)]'
                      }`}
                    >
                      {t(notif.title, notif.titleAr)}
                    </h3>
                    <span className="text-xs text-[var(--muted)] whitespace-nowrap">
                      {formatTime(notif.createdAt)}
                    </span>
                  </div>

                  <p
                    className={`text-sm ${
                      !notif.read ? 'text-[var(--foreground)]' : 'text-[var(--muted)]'
                    } line-clamp-2`}
                  >
                    {t(notif.body, notif.bodyAr)}
                  </p>

                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: `${portalColor[notif.sourcePortal]}20`,
                        color: portalColor[notif.sourcePortal],
                      }}
                    >
                      {t(
                        portalLabel[notif.sourcePortal].en,
                        portalLabel[notif.sourcePortal].ar
                      )}
                    </span>
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-[var(--primary)]" />
                    )}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
