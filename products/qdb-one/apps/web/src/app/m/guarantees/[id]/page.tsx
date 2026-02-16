'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getGuaranteeById, getClaimsByGuarantee } from '@/data/guarantees';
import { getLoanById } from '@/data/financing';
import { getDocumentsByRecord } from '@/data/documents';
import { getPersonById } from '@/data/persons';
import { useParams } from 'next/navigation';
import MobileHeader from '@/components/mobile/MobileHeader';
import MobileCard from '@/components/mobile/MobileCard';
import MobileStatusBadge from '@/components/mobile/MobileStatusBadge';

export default function MobileGuaranteeDetailPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const params = useParams();
  const id = params.id as string;

  if (!user) return null;

  const guarantee = getGuaranteeById(id);
  if (!guarantee) {
    return (
      <div>
        <MobileHeader title={t('Guarantee', '\u0627\u0644\u0636\u0645\u0627\u0646')} showBack />
        <div className="px-4 py-12 text-center text-sm text-[var(--muted)]">
          {t('Guarantee not found', '\u0627\u0644\u0636\u0645\u0627\u0646 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F')}
        </div>
      </div>
    );
  }

  const claims = getClaimsByGuarantee(id);
  const documents = getDocumentsByRecord(id);
  const relatedLoan = guarantee.relatedLoanId ? getLoanById(guarantee.relatedLoanId) : null;
  const currentUserPendingSignature = guarantee.signatories.find(s => s.personId === user.personId && !s.signed);

  const formatAmount = (amount: number) => new Intl.NumberFormat('en-QA').format(amount);
  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div>
      <MobileHeader title={guarantee.id} showBack />
      <div className="px-4 py-4 space-y-3">
        {/* Header */}
        <MobileCard>
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="text-lg font-bold">{guarantee.id}</div>
              <div className="text-xs text-[var(--muted)]">{guarantee.type}</div>
            </div>
            <MobileStatusBadge status={guarantee.status} />
          </div>
          <div className="text-xl font-bold text-[var(--foreground)]">
            {formatAmount(guarantee.amount)} <span className="text-sm">{guarantee.currency}</span>
          </div>
        </MobileCard>

        {/* Pending Signature */}
        {currentUserPendingSignature && (
          <div className="bg-[var(--warning)]/10 border border-[var(--warning)] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[var(--warning)]">⚠</span>
              <span className="text-sm font-semibold">{t('Signature Required', '\u0627\u0644\u062A\u0648\u0642\u064A\u0639 \u0645\u0637\u0644\u0648\u0628')}</span>
            </div>
            <p className="text-xs text-[var(--muted)] mb-3">
              {t('You need to sign this guarantee.', '\u064A\u062C\u0628 \u0639\u0644\u064A\u0643 \u0627\u0644\u062A\u0648\u0642\u064A\u0639 \u0639\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u0636\u0645\u0627\u0646.')}
            </p>
            <Link
              href={`/m/guarantees/${id}/sign`}
              className="block w-full py-2.5 bg-[var(--warning)] text-white rounded-lg text-sm font-medium text-center"
            >
              {t('Sign Now', '\u0648\u0642\u0651\u0639 \u0627\u0644\u0622\u0646')}
            </Link>
          </div>
        )}

        {/* Details */}
        <MobileCard>
          <h2 className="text-sm font-semibold mb-3">{t('Details', '\u0627\u0644\u062A\u0641\u0627\u0635\u064A\u0644')}</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] text-[var(--muted)]">{t('Beneficiary', '\u0627\u0644\u0645\u0633\u062A\u0641\u064A\u062F')}</div>
              <div className="text-sm font-medium">{guarantee.beneficiary}</div>
            </div>
            {guarantee.issuedDate && (
              <div>
                <div className="text-[10px] text-[var(--muted)]">{t('Issued', '\u0627\u0644\u0625\u0635\u062F\u0627\u0631')}</div>
                <div className="text-sm font-medium">{formatDate(guarantee.issuedDate)}</div>
              </div>
            )}
            <div>
              <div className="text-[10px] text-[var(--muted)]">{t('Expiry', '\u0627\u0644\u0627\u0646\u062A\u0647\u0627\u0621')}</div>
              <div className="text-sm font-medium">{formatDate(guarantee.expiryDate)}</div>
            </div>
            <div>
              <div className="text-[10px] text-[var(--muted)]">{t('Currency', '\u0627\u0644\u0639\u0645\u0644\u0629')}</div>
              <div className="text-sm font-medium">{guarantee.currency}</div>
            </div>
          </div>
        </MobileCard>

        {/* Collateral */}
        {guarantee.collateral && guarantee.collateral.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold mb-2">{t('Collateral', '\u0627\u0644\u0636\u0645\u0627\u0646\u0627\u062A')}</h2>
            {guarantee.collateral.map((item, i) => (
              <MobileCard key={i} className="mb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{item.type}</div>
                    <div className="text-[10px] text-[var(--muted)]">{item.description}</div>
                  </div>
                  <div className="text-sm font-bold">{formatAmount(item.value)} QAR</div>
                </div>
              </MobileCard>
            ))}
          </div>
        )}

        {/* Signatories */}
        <div>
          <h2 className="text-sm font-semibold mb-2">{t('Signatories', '\u0627\u0644\u0645\u0648\u0642\u0639\u0648\u0646')}</h2>
          {guarantee.signatories.map((sig, i) => {
            const person = getPersonById(sig.personId);
            return (
              <MobileCard key={i} className="mb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs ${sig.signed ? 'bg-[var(--success)]' : 'bg-[var(--warning)]'}`}>
                      {sig.signed ? '\u2713' : '\u2026'}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{person?.fullNameEn || t('Unknown', '\u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641')}</div>
                      <div className="text-[10px] text-[var(--muted)]">{person?.fullNameAr}</div>
                    </div>
                  </div>
                  <div className={`text-xs font-medium ${sig.signed ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`}>
                    {sig.signed ? t('Signed', '\u062A\u0645 \u0627\u0644\u062A\u0648\u0642\u064A\u0639') : t('Pending', '\u0642\u064A\u062F \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631')}
                  </div>
                </div>
              </MobileCard>
            );
          })}
        </div>

        {/* Claims */}
        {claims.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold mb-2">{t('Claims', '\u0627\u0644\u0645\u0637\u0627\u0644\u0628\u0627\u062A')}</h2>
            {claims.map(claim => (
              <MobileCard key={claim.id} className="mb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{claim.id}</div>
                    <div className="text-[10px] text-[var(--muted)]">{formatDate(claim.filedAt)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{formatAmount(claim.amount)} QAR</span>
                    <MobileStatusBadge status={claim.status} />
                  </div>
                </div>
              </MobileCard>
            ))}
          </div>
        )}

        {/* Related Loan */}
        {relatedLoan && (
          <MobileCard href={`/m/financing/loans/${relatedLoan.id}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] text-[var(--muted)]">{t('Related Loan', '\u0627\u0644\u0642\u0631\u0636 \u0627\u0644\u0645\u0631\u062A\u0628\u0637')}</div>
                <div className="text-sm font-medium text-[var(--primary)]">{relatedLoan.id}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold">{formatAmount(relatedLoan.outstandingBalance)} QAR</div>
                <div className="text-[10px] text-[var(--muted)]">{t('Outstanding', '\u0627\u0644\u0645\u062A\u0628\u0642\u064A')}</div>
              </div>
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
                <div className="text-[10px] text-[var(--muted)] mt-0.5">{doc.type} · {doc.size}</div>
              </MobileCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
