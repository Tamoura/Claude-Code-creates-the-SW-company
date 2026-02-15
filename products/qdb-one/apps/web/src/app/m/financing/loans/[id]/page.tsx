'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLoanById } from '@/data/financing';
import { getDocumentsByRecord } from '@/data/documents';
import { useParams } from 'next/navigation';
import MobileHeader from '@/components/mobile/MobileHeader';
import MobileCard from '@/components/mobile/MobileCard';
import MobileStatusBadge from '@/components/mobile/MobileStatusBadge';

export default function MobileLoanDetailPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const params = useParams();

  if (!user) return null;

  const loan = getLoanById(params.id as string);

  if (!loan) {
    return (
      <div>
        <MobileHeader title={t('Loan', '\u0627\u0644\u0642\u0631\u0636')} showBack />
        <div className="px-4 py-12 text-center text-sm text-[var(--muted)]">
          {t('Loan not found', '\u0627\u0644\u0642\u0631\u0636 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F')}
        </div>
      </div>
    );
  }

  const documents = getDocumentsByRecord(loan.id);
  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-QA').format(amount);
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const paidAmount = loan.originalAmount - loan.outstandingBalance;
  const paymentProgress = (paidAmount / loan.originalAmount) * 100;

  return (
    <div>
      <MobileHeader title={loan.id} showBack />
      <div className="px-4 py-4 space-y-3">
        {/* Header card */}
        <MobileCard>
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-lg font-bold text-[var(--foreground)]">{loan.id}</div>
              <div className="text-xs text-[var(--muted)]">{loan.type}</div>
            </div>
            <MobileStatusBadge status={loan.status} />
          </div>
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[var(--border)]">
            <div>
              <div className="text-[10px] text-[var(--muted)]">{t('Original', '\u0627\u0644\u0623\u0635\u0644\u064A')}</div>
              <div className="text-sm font-semibold">{formatCurrency(loan.originalAmount)} {loan.currency}</div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--muted)]">{t('Outstanding', '\u0627\u0644\u0645\u062A\u0628\u0642\u064A')}</div>
              <div className="text-sm font-semibold">{formatCurrency(loan.outstandingBalance)} {loan.currency}</div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--muted)]">{t('Rate', '\u0627\u0644\u0645\u0639\u062F\u0644')}</div>
              <div className="text-sm font-semibold">{loan.interestRate}%</div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--muted)]">{t('Maturity', '\u0627\u0644\u0627\u0633\u062A\u062D\u0642\u0627\u0642')}</div>
              <div className="text-sm font-semibold">{formatDate(loan.maturityDate)}</div>
            </div>
          </div>
        </MobileCard>

        {/* Progress */}
        <MobileCard>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[var(--muted)]">{t('Payment Progress', '\u062A\u0642\u062F\u0645 \u0627\u0644\u0633\u062F\u0627\u062F')}</span>
            <span className="text-xs font-medium">{paymentProgress.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-[var(--success)] h-2 rounded-full" style={{ width: `${paymentProgress}%` }} />
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-[var(--muted)]">
            <span>{t('Paid:', '\u0627\u0644\u0645\u062F\u0641\u0648\u0639:')} {formatCurrency(paidAmount)}</span>
            <span>{t('Remaining:', '\u0627\u0644\u0645\u062A\u0628\u0642\u064A:')} {formatCurrency(loan.outstandingBalance)}</span>
          </div>
        </MobileCard>

        {/* Next Payment */}
        <MobileCard className="bg-blue-50 border-blue-200">
          <div className="text-xs text-[var(--muted)] mb-1">{t('Next Payment Due', '\u0627\u0644\u062F\u0641\u0639\u0629 \u0627\u0644\u0642\u0627\u062F\u0645\u0629')}</div>
          <div className="flex items-center justify-between">
            <div className="text-lg font-bold">{formatCurrency(loan.nextPaymentAmount)} {loan.currency}</div>
            <div className="text-sm font-medium">{formatDate(loan.nextPaymentDate)}</div>
          </div>
        </MobileCard>

        {/* Payment Schedule */}
        <div>
          <h2 className="text-sm font-semibold text-[var(--foreground)] mb-2">{t('Payment Schedule', '\u062C\u062F\u0648\u0644 \u0627\u0644\u062F\u0641\u0639\u0627\u062A')}</h2>
          {loan.payments.map(payment => (
            <MobileCard key={payment.id} className="mb-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-[var(--foreground)]">{formatCurrency(payment.amount)} {loan.currency}</div>
                  <div className="text-[10px] text-[var(--muted)]">{formatDate(payment.date)}</div>
                </div>
                <MobileStatusBadge status={payment.status} />
              </div>
            </MobileCard>
          ))}
        </div>

        {/* Cross-portal links */}
        {loan.relatedGuaranteeId && (
          <MobileCard href={`/m/guarantees/${loan.relatedGuaranteeId}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] text-[var(--muted)]">{t('Related Guarantee', '\u0627\u0644\u0636\u0645\u0627\u0646 \u0627\u0644\u0645\u0631\u062A\u0628\u0637')}</div>
                <div className="text-sm font-medium text-[var(--primary)]">{loan.relatedGuaranteeId}</div>
              </div>
              <span className="text-[var(--muted)]">\u203A</span>
            </div>
          </MobileCard>
        )}

        {loan.relatedAdvisorySessionId && (
          <MobileCard href={`/m/advisory/sessions/${loan.relatedAdvisorySessionId}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] text-[var(--muted)]">{t('Related Advisory', '\u0627\u0644\u0627\u0633\u062A\u0634\u0627\u0631\u0629 \u0627\u0644\u0645\u0631\u062A\u0628\u0637\u0629')}</div>
                <div className="text-sm font-medium text-[var(--primary)]">{loan.relatedAdvisorySessionId}</div>
              </div>
              <span className="text-[var(--muted)]">\u203A</span>
            </div>
          </MobileCard>
        )}

        {/* Documents */}
        {documents.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-[var(--foreground)] mb-2">{t('Documents', '\u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A')}</h2>
            {documents.map(doc => (
              <MobileCard key={doc.id} className="mb-2">
                <div className="text-sm font-medium text-[var(--foreground)]">{doc.name}</div>
                <div className="text-[10px] text-[var(--muted)] mt-0.5">{doc.type} \u00B7 {doc.size}</div>
              </MobileCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
