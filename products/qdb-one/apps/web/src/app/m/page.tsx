'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLoansByOrg, getTotalOutstanding } from '@/data/financing';
import { getGuaranteesByOrg, getPendingSignatures, getTotalGuaranteeValue } from '@/data/guarantees';
import { getProgramsByOrg, getUpcomingSessions } from '@/data/advisory';
import { getActivitiesByOrg } from '@/data/activity';
import { getUpcomingPayments } from '@/data/financing';
import { getUnreadCount } from '@/data/notifications';
import MobileCard from '@/components/mobile/MobileCard';

export default function MobileDashboard() {
  const { user, activeOrg, isAuthenticated } = useAuth();
  const { t, lang, setLang } = useLanguage();

  // Unauthenticated: show mobile landing
  if (!isAuthenticated || !user || !activeOrg) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] via-[#2d5a8e] to-[#1e3a5f] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#c8a951] flex items-center justify-center text-[#1e3a5f] font-bold text-sm">Q</div>
            <span className="text-white font-semibold">QDB One</span>
          </div>
          <button
            onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
            className="px-3 py-1.5 rounded-lg border border-white/20 text-white text-xs"
          >
            {lang === 'en' ? '\u0639\u0631\u0628\u064A' : 'English'}
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#c8a951] flex items-center justify-center text-[#1e3a5f] font-bold text-2xl mb-6">Q</div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {t('QDB One', 'QDB One')}
          </h1>
          <p className="text-white/70 text-sm mb-8 max-w-xs">
            {t(
              'Your unified gateway to Qatar Development Bank services',
              '\u0628\u0648\u0627\u0628\u062A\u0643 \u0627\u0644\u0645\u0648\u062D\u062F\u0629 \u0644\u062E\u062F\u0645\u0627\u062A \u0628\u0646\u0643 \u0642\u0637\u0631 \u0644\u0644\u062A\u0646\u0645\u064A\u0629'
            )}
          </p>

          <Link
            href="/m/login"
            className="w-full max-w-xs py-3 bg-white text-[#1e3a5f] rounded-xl font-semibold text-center"
          >
            {t('Sign In', '\u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644')}
          </Link>

          <div className="mt-8 flex items-center gap-4 text-white/50 text-xs">
            <span>\u25C8 {t('Financing', '\u0627\u0644\u062A\u0645\u0648\u064A\u0644')}</span>
            <span>\u25C9 {t('Guarantees', '\u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062A')}</span>
            <span>\u25CE {t('Advisory', '\u0627\u0644\u0627\u0633\u062A\u0634\u0627\u0631\u0627\u062A')}</span>
          </div>
        </div>

        <div className="text-center py-4 text-white/30 text-[10px]">
          {t('\u00A9 2026 Qatar Development Bank', '\u00A9 2026 \u0628\u0646\u0643 \u0642\u0637\u0631 \u0644\u0644\u062A\u0646\u0645\u064A\u0629')}
        </div>
      </div>
    );
  }

  // Authenticated: show dashboard
  const orgId = activeOrg.orgId;
  const totalOutstanding = getTotalOutstanding(orgId);
  const loans = getLoansByOrg(orgId);
  const guarantees = getGuaranteesByOrg(orgId);
  const pendingSignatures = getPendingSignatures(user.personId);
  const totalGuaranteeValue = getTotalGuaranteeValue(orgId);
  const programs = getProgramsByOrg(orgId);
  const upcomingSessions = getUpcomingSessions(orgId);
  const upcomingPayments = getUpcomingPayments(orgId);
  const recentActivity = getActivitiesByOrg(orgId).slice(0, 5);
  const unreadNotifs = getUnreadCount(user.personId);

  const activeLoans = loans.filter(l => l.status === 'active');
  const activeGuarantees = guarantees.filter(g => g.status === 'active' || g.status === 'pending_signature');

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat('en-QA', { style: 'decimal', minimumFractionDigits: 0 }).format(amount);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  const timeAgo = (dateStr: string) => {
    const diffDays = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return t('Today', '\u0627\u0644\u064A\u0648\u0645');
    if (diffDays === 1) return t('Yesterday', '\u0623\u0645\u0633');
    return t(`${diffDays}d ago`, `\u0645\u0646\u0630 ${diffDays} \u064A`);
  };

  const portalIcon: Record<string, string> = { financing: '\u25C8', guarantee: '\u25C9', advisory: '\u25CE' };
  const portalColor: Record<string, string> = { financing: 'var(--primary)', guarantee: 'var(--warning)', advisory: 'var(--success)' };

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-bold text-[var(--foreground)]">
          {t(`Welcome, ${user.fullNameEn.split(' ')[0]}`, `\u0645\u0631\u062D\u0628\u0627\u064B\u060C ${user.fullNameAr.split(' ')[0]}`)}
        </h1>
        <p className="text-xs text-[var(--muted)] mt-0.5">
          {t(activeOrg.orgNameEn, activeOrg.orgNameAr)}
        </p>
      </div>

      {/* Notification alert */}
      {unreadNotifs > 0 && (
        <Link href="/m/notifications" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--warning)]/10 text-[var(--warning)] text-xs font-medium">
          <span>&#x1F514;</span>
          {t(`${unreadNotifs} unread notifications`, `${unreadNotifs} \u0625\u0634\u0639\u0627\u0631\u0627\u062A \u063A\u064A\u0631 \u0645\u0642\u0631\u0648\u0621\u0629`)}
        </Link>
      )}

      {/* Pending signature alert */}
      {pendingSignatures.length > 0 && (
        <div className="bg-[var(--warning)]/10 border border-[var(--warning)]/30 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[var(--warning)]">\u26A0</span>
            <span className="font-semibold text-xs">{t('Action Required', '\u0625\u062C\u0631\u0627\u0621 \u0645\u0637\u0644\u0648\u0628')}</span>
          </div>
          {pendingSignatures.map(g => (
            <Link key={g.id} href={`/m/guarantees/${g.id}`} className="block text-xs text-[var(--foreground)] mt-1">
              {t(`${g.id} (QAR ${formatAmount(g.amount)}) needs signature`, `${g.id} (\u0631.\u0642 ${formatAmount(g.amount)}) \u064A\u062A\u0637\u0644\u0628 \u062A\u0648\u0642\u064A\u0639\u0643`)}
              <span className="text-[var(--primary)] ml-1">\u2192</span>
            </Link>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <MobileCard href="/m/financing">
        <div className="flex items-center justify-between mb-2">
          <span className="text-lg">\u25C8</span>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
            {t('Financing', '\u0627\u0644\u062A\u0645\u0648\u064A\u0644')}
          </span>
        </div>
        <div className="text-xl font-bold">QAR {formatAmount(totalOutstanding)}</div>
        <div className="text-xs text-[var(--muted)] mt-0.5">
          {t(`${activeLoans.length} active loans`, `${activeLoans.length} \u0642\u0631\u0648\u0636 \u0646\u0634\u0637\u0629`)}
        </div>
      </MobileCard>

      <div className="grid grid-cols-2 gap-3">
        <MobileCard href="/m/guarantees">
          <span className="text-lg">\u25C9</span>
          <div className="text-lg font-bold mt-1">QAR {formatAmount(totalGuaranteeValue)}</div>
          <div className="text-[10px] text-[var(--muted)]">
            {t(`${activeGuarantees.length} guarantees`, `${activeGuarantees.length} \u0636\u0645\u0627\u0646\u0627\u062A`)}
          </div>
        </MobileCard>

        <MobileCard href="/m/advisory">
          <span className="text-lg">\u25CE</span>
          <div className="text-lg font-bold mt-1">{programs.length}</div>
          <div className="text-[10px] text-[var(--muted)]">
            {t('Programs', '\u0628\u0631\u0627\u0645\u062C')}
          </div>
        </MobileCard>
      </div>

      {/* Upcoming Payments */}
      {upcomingPayments.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[var(--foreground)] mb-2">
            {t('Upcoming Payments', '\u0627\u0644\u062F\u0641\u0639\u0627\u062A \u0627\u0644\u0642\u0627\u062F\u0645\u0629')}
          </h2>
          {upcomingPayments.map(({ loan, paymentDate, amount }) => (
            <MobileCard key={loan.id} href={`/m/financing/loans/${loan.id}`} className="mb-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">QAR {formatAmount(amount)}</div>
                  <div className="text-[10px] text-[var(--muted)]">{loan.id}</div>
                </div>
                <div className="text-xs text-[var(--muted)]">{formatDate(paymentDate)}</div>
              </div>
            </MobileCard>
          ))}
        </div>
      )}

      {/* Upcoming Sessions */}
      {upcomingSessions.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[var(--foreground)] mb-2">
            {t('Upcoming Sessions', '\u0627\u0644\u062C\u0644\u0633\u0627\u062A \u0627\u0644\u0642\u0627\u062F\u0645\u0629')}
          </h2>
          {upcomingSessions.map(session => (
            <MobileCard key={session.id} href={`/m/advisory/sessions/${session.id}`} className="mb-2">
              <div className="text-sm font-medium">{session.topic}</div>
              <div className="text-[10px] text-[var(--muted)] mt-0.5">{session.advisorName} \u00B7 {session.date} {session.time}</div>
            </MobileCard>
          ))}
        </div>
      )}

      {/* Recent Activity */}
      <div>
        <h2 className="text-sm font-semibold text-[var(--foreground)] mb-2">
          {t('Recent Activity', '\u0627\u0644\u0646\u0634\u0627\u0637 \u0627\u0644\u0623\u062E\u064A\u0631')}
        </h2>
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] divide-y divide-[var(--border)]">
          {recentActivity.map(act => (
            <Link
              key={act.id}
              href={act.deepLink.replace(/^\//, '/m/')}
              className="flex items-start gap-3 px-4 py-3 active:bg-gray-50 transition-colors"
            >
              <span className="text-base mt-0.5" style={{ color: portalColor[act.sourcePortal] }}>
                {portalIcon[act.sourcePortal]}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[var(--foreground)]">{t(act.description, act.descriptionAr)}</p>
                <span className="text-[10px] text-[var(--muted)]">{timeAgo(act.createdAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
