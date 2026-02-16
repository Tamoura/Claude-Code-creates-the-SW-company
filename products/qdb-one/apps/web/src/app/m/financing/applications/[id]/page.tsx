'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getApplicationById } from '@/data/financing';
import { getDocumentsByRecord } from '@/data/documents';
import { useParams } from 'next/navigation';
import MobileHeader from '@/components/mobile/MobileHeader';
import MobileCard from '@/components/mobile/MobileCard';
import MobileStatusBadge from '@/components/mobile/MobileStatusBadge';

export default function MobileApplicationDetailPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const params = useParams();

  if (!user) return null;

  const application = getApplicationById(params.id as string);

  if (!application) {
    return (
      <div>
        <MobileHeader title={t('Application', '\u0627\u0644\u0637\u0644\u0628')} showBack />
        <div className="px-4 py-12 text-center text-sm text-[var(--muted)]">
          {t('Application not found', '\u0627\u0644\u0637\u0644\u0628 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F')}
        </div>
      </div>
    );
  }

  const documents = getDocumentsByRecord(application.id);
  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-QA').format(amount);
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const statusLabels: Record<string, { en: string; ar: string }> = {
    draft: { en: 'Draft', ar: '\u0645\u0633\u0648\u062F\u0629' },
    submitted: { en: 'Submitted', ar: '\u0645\u0642\u062F\u0645' },
    under_review: { en: 'Under Review', ar: '\u0642\u064A\u062F \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629' },
    approved: { en: 'Approved', ar: '\u0645\u0648\u0627\u0641\u0642 \u0639\u0644\u064A\u0647' },
    rejected: { en: 'Rejected', ar: '\u0645\u0631\u0641\u0648\u0636' },
  };

  const currentStepIndex = application.statusTimeline.length - 1;

  return (
    <div>
      <MobileHeader title={application.id} showBack />
      <div className="px-4 py-4 space-y-3">
        {/* Header */}
        <MobileCard>
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-lg font-bold">{application.id}</div>
              <div className="text-xs text-[var(--muted)]">{application.type}</div>
            </div>
            <MobileStatusBadge status={application.status} label={t(statusLabels[application.status]?.en || application.status, statusLabels[application.status]?.ar || application.status)} />
          </div>
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[var(--border)]">
            <div>
              <div className="text-[10px] text-[var(--muted)]">{t('Amount', '\u0627\u0644\u0645\u0628\u0644\u063A')}</div>
              <div className="text-sm font-semibold">{formatCurrency(application.amount)} {application.currency}</div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--muted)]">{t('Submitted', '\u0627\u0644\u062A\u0642\u062F\u064A\u0645')}</div>
              <div className="text-sm font-semibold">{formatDate(application.submittedAt)}</div>
            </div>
          </div>
        </MobileCard>

        {/* Timeline */}
        <MobileCard>
          <h2 className="text-sm font-semibold text-[var(--foreground)] mb-3">{t('Status Timeline', '\u0627\u0644\u062C\u062F\u0648\u0644 \u0627\u0644\u0632\u0645\u0646\u064A')}</h2>
          <div className="space-y-4">
            {application.statusTimeline.map((step, index) => {
              const isCompleted = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;
              return (
                <div key={index} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-2.5 h-2.5 rounded-full border-2 ${
                      isCompleted ? 'bg-[var(--primary)] border-[var(--primary)]'
                      : isCurrent ? 'bg-[var(--warning)] border-[var(--warning)]'
                      : 'bg-transparent border-gray-300'
                    }`} />
                    {index < application.statusTimeline.length - 1 && (
                      <div className={`w-0.5 h-8 ${isCompleted ? 'bg-[var(--primary)]' : 'bg-gray-200'}`} />
                    )}
                  </div>
                  <div className="flex-1 -mt-1">
                    <p className={`text-xs font-medium ${isCurrent ? 'text-[var(--foreground)]' : 'text-[var(--muted)]'}`}>
                      {t(statusLabels[step.status]?.en || step.status, statusLabels[step.status]?.ar || step.status)}
                    </p>
                    <p className="text-[10px] text-[var(--muted)]">{formatDate(step.date)}</p>
                    {step.note && <p className="text-[10px] text-[var(--foreground)] mt-0.5">{step.note}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </MobileCard>

        {/* Related Guarantee */}
        {application.relatedGuaranteeId && (
          <MobileCard href={`/m/guarantees/${application.relatedGuaranteeId}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] text-[var(--muted)]">{t('Related Guarantee', '\u0627\u0644\u0636\u0645\u0627\u0646 \u0627\u0644\u0645\u0631\u062A\u0628\u0637')}</div>
                <div className="text-sm font-medium text-[var(--primary)]">{application.relatedGuaranteeId}</div>
              </div>
              <span className="text-[var(--muted)]">\u203A</span>
            </div>
          </MobileCard>
        )}

        {/* Documents */}
        {documents.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold mb-2">{t('Documents', '\u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A')}</h2>
            {documents.map(doc => (
              <MobileCard key={doc.id} className="mb-2">
                <div className="text-sm font-medium">{doc.name}</div>
                <div className="text-[10px] text-[var(--muted)] mt-0.5">{doc.type} \u00B7 {doc.size}</div>
              </MobileCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
