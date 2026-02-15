'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLoansByOrg, getApplicationsByOrg } from '@/data/financing';
import MobileHeader from '@/components/mobile/MobileHeader';
import MobileCard from '@/components/mobile/MobileCard';
import MobileStatusBadge from '@/components/mobile/MobileStatusBadge';

export default function MobileFinancingPage() {
  const { user, activeOrg } = useAuth();
  const { t } = useLanguage();

  if (!user || !activeOrg) return null;

  const loans = getLoansByOrg(activeOrg.orgId);
  const applications = getApplicationsByOrg(activeOrg.orgId);

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat('en-QA', { style: 'decimal', minimumFractionDigits: 0 }).format(amount);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div>
      <MobileHeader title={t('Financing', '\u0627\u0644\u062A\u0645\u0648\u064A\u0644')} />
      <div className="px-4 py-4 space-y-4">
        {/* Loans Section */}
        <h2 className="text-sm font-semibold text-[var(--foreground)]">
          {t('Active Loans', '\u0627\u0644\u0642\u0631\u0648\u0636 \u0627\u0644\u0646\u0634\u0637\u0629')}
        </h2>
        {loans.length === 0 ? (
          <p className="text-sm text-[var(--muted)] text-center py-8">{t('No loans found', '\u0644\u0627 \u062A\u0648\u062C\u062F \u0642\u0631\u0648\u0636')}</p>
        ) : (
          loans.map(loan => (
            <MobileCard key={loan.id} href={`/m/financing/loans/${loan.id}`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-sm font-medium text-[var(--primary)]">{loan.id}</div>
                  <div className="text-xs text-[var(--muted)]">{loan.type}</div>
                </div>
                <MobileStatusBadge status={loan.status} />
              </div>
              <div className="flex items-center justify-between">
                <div className="text-base font-bold text-[var(--foreground)]">QAR {formatAmount(loan.outstandingBalance)}</div>
                <div className="text-xs text-[var(--muted)]">{t('Next:', '\u0627\u0644\u0642\u0627\u062F\u0645:')} {formatDate(loan.nextPaymentDate)}</div>
              </div>
            </MobileCard>
          ))
        )}

        {/* Applications Section */}
        <h2 className="text-sm font-semibold text-[var(--foreground)] pt-2">
          {t('Applications', '\u0627\u0644\u0637\u0644\u0628\u0627\u062A')}
        </h2>
        {applications.length === 0 ? (
          <p className="text-sm text-[var(--muted)] text-center py-8">{t('No applications', '\u0644\u0627 \u062A\u0648\u062C\u062F \u0637\u0644\u0628\u0627\u062A')}</p>
        ) : (
          applications.map(app => (
            <MobileCard key={app.id} href={`/m/financing/applications/${app.id}`}>
              <div className="flex items-start justify-between mb-1">
                <div>
                  <div className="text-sm font-medium text-[var(--foreground)]">{app.id}</div>
                  <div className="text-xs text-[var(--muted)]">{app.type}</div>
                </div>
                <MobileStatusBadge status={app.status} />
              </div>
              <div className="text-base font-bold text-[var(--foreground)]">QAR {formatAmount(app.amount)}</div>
            </MobileCard>
          ))
        )}
      </div>
    </div>
  );
}
