'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getNotificationsByPerson } from '@/data/notifications';
import MobileHeader from '@/components/mobile/MobileHeader';

export default function MobileNotificationsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();

  if (!user) return null;

  const notifications = getNotificationsByPerson(user.personId);

  const formatTime = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return t('Now', '\u0627\u0644\u0622\u0646');
    if (diffMins < 60) return t(`${diffMins}m`, `${diffMins}\u062F`);
    if (diffHours < 24) return t(`${diffHours}h`, `${diffHours}\u0633`);
    if (diffDays < 7) return t(`${diffDays}d`, `${diffDays}\u064A`);
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const portalColor: Record<string, string> = {
    financing: 'var(--primary)',
    guarantee: 'var(--warning)',
    advisory: 'var(--success)',
    system: 'var(--muted)',
  };

  const portalIcon: Record<string, string> = {
    financing: '\u25C8',
    guarantee: '\u25C9',
    advisory: '\u25CE',
    system: '\u2699',
  };

  return (
    <div>
      <MobileHeader title={t('Notifications', '\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A')} showBack />
      <div className="divide-y divide-[var(--border)]">
        {notifications.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-[var(--muted)]">
            {t('No notifications', '\u0644\u0627 \u062A\u0648\u062C\u062F \u0625\u0634\u0639\u0627\u0631\u0627\u062A')}
          </div>
        ) : (
          notifications.map(notif => (
            <Link
              key={notif.id}
              href={notif.deepLink.replace(/^\//, '/m/')}
              className={`flex items-start gap-3 px-4 py-3 active:bg-gray-50 transition-colors ${
                !notif.read ? 'bg-[var(--primary)]/5' : ''
              }`}
            >
              <div
                className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: portalColor[notif.sourcePortal] }}
              >
                {portalIcon[notif.sourcePortal]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className={`text-sm font-medium truncate ${!notif.read ? 'text-[var(--foreground)]' : 'text-[var(--muted)]'}`}>
                    {t(notif.title, notif.titleAr)}
                  </h3>
                  <span className="text-[10px] text-[var(--muted)] whitespace-nowrap">{formatTime(notif.createdAt)}</span>
                </div>
                <p className={`text-xs mt-0.5 line-clamp-2 ${!notif.read ? 'text-[var(--foreground)]' : 'text-[var(--muted)]'}`}>
                  {t(notif.body, notif.bodyAr)}
                </p>
                {!notif.read && <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] mt-1" />}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
