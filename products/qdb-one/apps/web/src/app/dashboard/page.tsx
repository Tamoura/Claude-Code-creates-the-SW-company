'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLoansByOrg, getApplicationsByOrg, getTotalOutstanding, getUpcomingPayments } from '@/data/financing';
import { getGuaranteesByOrg, getPendingSignatures, getTotalGuaranteeValue } from '@/data/guarantees';
import { getProgramsByOrg, getUpcomingSessions } from '@/data/advisory';
import { getActivitiesByOrg } from '@/data/activity';
import { getUnreadCount } from '@/data/notifications';

export default function DashboardPage() {
  const { user, activeOrg } = useAuth();
  const { t } = useLanguage();

  if (!user || !activeOrg) return null;

  const orgId = activeOrg.orgId;

  // Aggregate data for active org
  const loans = getLoansByOrg(orgId);
  const applications = getApplicationsByOrg(orgId);
  const totalOutstanding = getTotalOutstanding(orgId);
  const upcomingPayments = getUpcomingPayments(orgId);
  const guarantees = getGuaranteesByOrg(orgId);
  const pendingSignatures = getPendingSignatures(user.personId);
  const totalGuaranteeValue = getTotalGuaranteeValue(orgId);
  const programs = getProgramsByOrg(orgId);
  const upcomingSessions = getUpcomingSessions(orgId);
  const recentActivity = getActivitiesByOrg(orgId).slice(0, 5);
  const unreadNotifs = getUnreadCount(user.personId);

  const activeLoans = loans.filter(l => l.status === 'active');
  const activeGuarantees = guarantees.filter(g => g.status === 'active' || g.status === 'pending_signature');

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat('en-QA', { style: 'decimal', minimumFractionDigits: 0 }).format(amount);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const timeAgo = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return t('Today', 'اليوم');
    if (diffDays === 1) return t('Yesterday', 'أمس');
    if (diffDays < 7) return t(`${diffDays} days ago`, `منذ ${diffDays} أيام`);
    if (diffDays < 30) return t(`${Math.floor(diffDays / 7)} weeks ago`, `منذ ${Math.floor(diffDays / 7)} أسابيع`);
    return formatDate(dateStr);
  };

  const portalIcon: Record<string, string> = {
    financing: '◈',
    guarantee: '◉',
    advisory: '◎',
  };

  const portalColor: Record<string, string> = {
    financing: 'var(--primary)',
    guarantee: 'var(--warning)',
    advisory: 'var(--success)',
  };

  return (
    <div className="space-y-6">
      {/* Welcome & Alerts */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">
            {t(`Welcome back, ${user.fullNameEn.split(' ')[0]}`, `مرحباً، ${user.fullNameAr.split(' ')[0]}`)}
          </h1>
          <p className="text-sm text-[var(--muted)] mt-1">
            {t(activeOrg.orgNameEn, activeOrg.orgNameAr)} · CR {activeOrg.crNumber}
          </p>
        </div>
        {unreadNotifs > 0 && (
          <Link href="/notifications" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--warning)]/10 text-[var(--warning)] text-sm font-medium hover:bg-[var(--warning)]/20 transition-colors">
            <span>🔔</span>
            {t(`${unreadNotifs} unread notifications`, `${unreadNotifs} إشعارات غير مقروءة`)}
          </Link>
        )}
      </div>

      {/* Action Alerts */}
      {pendingSignatures.length > 0 && (
        <div className="bg-[var(--warning)]/10 border border-[var(--warning)]/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[var(--warning)]">⚠</span>
            <span className="font-semibold text-sm">{t('Action Required', 'إجراء مطلوب')}</span>
          </div>
          {pendingSignatures.map((g) => (
            <Link key={g.id} href={`/guarantees/${g.id}`} className="flex items-center gap-2 text-sm text-[var(--foreground)] hover:underline">
              {t(
                `Guarantee ${g.id} (QAR ${formatAmount(g.amount)}) requires your signature`,
                `الضمان ${g.id} (${formatAmount(g.amount)} ريال قطري) يتطلب توقيعك`
              )}
              <span className="text-[var(--primary)]">→</span>
            </Link>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/financing" className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">◈</span>
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
              {t('Financing', 'التمويل')}
            </span>
          </div>
          <div className="text-2xl font-bold text-[var(--foreground)]">
            QAR {formatAmount(totalOutstanding)}
          </div>
          <div className="text-sm text-[var(--muted)] mt-1">
            {t(`${activeLoans.length} active loans`, `${activeLoans.length} قروض نشطة`)}
          </div>
          {applications.length > 0 && (
            <div className="text-xs text-[var(--warning)] mt-2">
              {t(`${applications.length} pending applications`, `${applications.length} طلبات معلقة`)}
            </div>
          )}
        </Link>

        <Link href="/guarantees" className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">◉</span>
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-[var(--warning)]/10 text-[var(--warning)]">
              {t('Guarantees', 'الضمانات')}
            </span>
          </div>
          <div className="text-2xl font-bold text-[var(--foreground)]">
            QAR {formatAmount(totalGuaranteeValue)}
          </div>
          <div className="text-sm text-[var(--muted)] mt-1">
            {t(`${activeGuarantees.length} active guarantees`, `${activeGuarantees.length} ضمانات نشطة`)}
          </div>
          {pendingSignatures.length > 0 && (
            <div className="text-xs text-[var(--danger)] mt-2">
              {t(`${pendingSignatures.length} pending signatures`, `${pendingSignatures.length} توقيعات معلقة`)}
            </div>
          )}
        </Link>

        <Link href="/advisory" className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">◎</span>
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-[var(--success)]/10 text-[var(--success)]">
              {t('Advisory', 'الاستشارات')}
            </span>
          </div>
          <div className="text-2xl font-bold text-[var(--foreground)]">
            {programs.length}
          </div>
          <div className="text-sm text-[var(--muted)] mt-1">
            {t('Active programs', 'برامج نشطة')}
          </div>
          {upcomingSessions.length > 0 && (
            <div className="text-xs text-[var(--primary)] mt-2">
              {t(`${upcomingSessions.length} upcoming sessions`, `${upcomingSessions.length} جلسات قادمة`)}
            </div>
          )}
        </Link>

        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">▤</span>
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-[var(--muted)]">
              {t('Documents', 'المستندات')}
            </span>
          </div>
          <div className="text-2xl font-bold text-[var(--foreground)]">
            10
          </div>
          <div className="text-sm text-[var(--muted)] mt-1">
            {t('Total documents', 'إجمالي المستندات')}
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed — 2 cols */}
        <div className="lg:col-span-2 bg-[var(--card-bg)] rounded-xl border border-[var(--border)]">
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <h2 className="font-semibold text-[var(--foreground)]">{t('Recent Activity', 'النشاط الأخير')}</h2>
            <span className="text-xs text-[var(--muted)]">{t('Across all portals', 'عبر جميع البوابات')}</span>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {recentActivity.map((act) => (
              <Link key={act.id} href={act.deepLink} className="flex items-start gap-3 px-5 py-4 hover:bg-gray-50 transition-colors">
                <span
                  className="text-lg mt-0.5"
                  style={{ color: portalColor[act.sourcePortal] }}
                >
                  {portalIcon[act.sourcePortal]}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--foreground)]">
                    {t(act.description, act.descriptionAr)}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-[var(--muted)]">{timeAgo(act.createdAt)}</span>
                    <span className="text-xs text-[var(--muted)]">·</span>
                    <span className="text-xs font-medium" style={{ color: portalColor[act.sourcePortal] }}>
                      {t(
                        act.sourcePortal.charAt(0).toUpperCase() + act.sourcePortal.slice(1),
                        act.sourcePortal === 'financing' ? 'التمويل' : act.sourcePortal === 'guarantee' ? 'الضمانات' : 'الاستشارات'
                      )}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Upcoming Payments */}
          {upcomingPayments.length > 0 && (
            <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)]">
              <div className="px-5 py-4 border-b border-[var(--border)]">
                <h2 className="font-semibold text-[var(--foreground)] text-sm">{t('Upcoming Payments', 'الدفعات القادمة')}</h2>
              </div>
              <div className="p-5 space-y-3">
                {upcomingPayments.map(({ loan, paymentDate, amount }) => (
                  <Link key={loan.id} href={`/financing/loans/${loan.id}`} className="block hover:bg-gray-50 -mx-2 px-2 py-2 rounded-lg transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[var(--foreground)]">
                        QAR {formatAmount(amount)}
                      </span>
                      <span className="text-xs text-[var(--muted)]">{formatDate(paymentDate)}</span>
                    </div>
                    <div className="text-xs text-[var(--muted)] mt-0.5">{loan.type} · {loan.id}</div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Sessions */}
          {upcomingSessions.length > 0 && (
            <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)]">
              <div className="px-5 py-4 border-b border-[var(--border)]">
                <h2 className="font-semibold text-[var(--foreground)] text-sm">{t('Upcoming Sessions', 'الجلسات القادمة')}</h2>
              </div>
              <div className="p-5 space-y-3">
                {upcomingSessions.map((session) => (
                  <Link key={session.id} href={`/advisory/sessions/${session.id}`} className="block hover:bg-gray-50 -mx-2 px-2 py-2 rounded-lg transition-colors">
                    <div className="text-sm font-medium text-[var(--foreground)]">{session.topic}</div>
                    <div className="text-xs text-[var(--muted)] mt-1">
                      {session.advisorName} · {session.date} {session.time}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Program Progress */}
          {programs.length > 0 && (
            <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)]">
              <div className="px-5 py-4 border-b border-[var(--border)]">
                <h2 className="font-semibold text-[var(--foreground)] text-sm">{t('Program Progress', 'تقدم البرامج')}</h2>
              </div>
              <div className="p-5 space-y-4">
                {programs.map((program) => (
                  <Link key={program.id} href={`/advisory/programs/${program.id}`} className="block hover:bg-gray-50 -mx-2 px-2 py-2 rounded-lg transition-colors">
                    <div className="text-sm font-medium text-[var(--foreground)]">
                      {t(program.nameEn, program.nameAr)}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--success)] rounded-full"
                          style={{ width: `${program.progress}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-[var(--muted)]">{program.progress}%</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
