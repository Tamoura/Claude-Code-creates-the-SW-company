'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getGuaranteesByOrg, getClaimsByGuarantee } from '@/data/guarantees';
import MobileHeader from '@/components/mobile/MobileHeader';
import MobileCard from '@/components/mobile/MobileCard';
import MobileStatusBadge from '@/components/mobile/MobileStatusBadge';

export default function MobileGuaranteesPage() {
  const { user, activeOrg } = useAuth();
  const { t } = useLanguage();

  if (!user || !activeOrg) return null;

  const guarantees = getGuaranteesByOrg(activeOrg.orgId);

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat('en-QA', { style: 'decimal', minimumFractionDigits: 0 }).format(amount);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div>
      <MobileHeader title={t('Guarantees', '\u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062A')} />
      <div className="px-4 py-4 space-y-3">
        {guarantees.length === 0 ? (
          <p className="text-sm text-[var(--muted)] text-center py-8">{t('No guarantees found', '\u0644\u0627 \u062A\u0648\u062C\u062F \u0636\u0645\u0627\u0646\u0627\u062A')}</p>
        ) : (
          guarantees.map(guarantee => {
            const claims = getClaimsByGuarantee(guarantee.id);
            return (
              <MobileCard key={guarantee.id} href={`/m/guarantees/${guarantee.id}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-sm font-medium text-[var(--primary)]">{guarantee.id}</div>
                    <div className="text-xs text-[var(--muted)]">{guarantee.type}</div>
                  </div>
                  <MobileStatusBadge status={guarantee.status} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-base font-bold text-[var(--foreground)]">QAR {formatAmount(guarantee.amount)}</div>
                  <div className="text-xs text-[var(--muted)]">{t('Exp:', '\u0627\u0646\u062A\u0647\u0627\u0621:')} {formatDate(guarantee.expiryDate)}</div>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <div className="text-xs text-[var(--muted)]">{guarantee.beneficiary}</div>
                  {claims.length > 0 && (
                    <span className="text-[10px] text-[var(--danger)] font-medium">
                      {t(`${claims.length} claim(s)`, `${claims.length} \u0645\u0637\u0627\u0644\u0628\u0629`)}
                    </span>
                  )}
                </div>
              </MobileCard>
            );
          })
        )}
      </div>
    </div>
  );
}
