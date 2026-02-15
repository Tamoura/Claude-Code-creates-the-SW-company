'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getGuaranteeById, getClaimsByGuarantee } from '@/data/guarantees';
import { getLoanById } from '@/data/financing';
import { getDocumentsByRecord } from '@/data/documents';
import { getPersonById } from '@/data/persons';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function GuaranteeDetailPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const params = useParams();
  const id = params.id as string;

  if (!user) return null;

  const guarantee = getGuaranteeById(id);
  if (!guarantee) {
    return (
      <div className="p-6">
        <p className="text-[var(--muted)]">{t('Guarantee not found', 'الضمان غير موجود')}</p>
      </div>
    );
  }

  const claims = getClaimsByGuarantee(id);
  const documents = getDocumentsByRecord(id);
  const relatedLoan = guarantee.relatedLoanId ? getLoanById(guarantee.relatedLoanId) : null;

  // Check if current user is a pending signatory
  const currentUserPendingSignature = guarantee.signatories.find(
    s => s.personId === user.personId && !s.signed
  );

  // Status badge styles
  const statusStyles = {
    active: 'bg-[var(--success)] text-white',
    pending_signature: 'bg-[var(--warning)] text-white',
    expired: 'bg-[var(--muted)] text-white',
    claimed: 'bg-[var(--danger)] text-white',
  };

  const statusLabels = {
    active: t('Active', 'نشط'),
    pending_signature: t('Pending Signature', 'في انتظار التوقيع'),
    expired: t('Expired', 'منتهي الصلاحية'),
    claimed: t('Claimed', 'تم المطالبة'),
  };

  const formatAmount = (amount: number) => new Intl.NumberFormat('en-QA').format(amount);
  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-QA');

  return (
    <div className="p-6 space-y-6">
      {/* Back Button */}
      <Link
        href="/guarantees"
        className="inline-flex items-center gap-2 text-[var(--primary)] hover:text-[var(--primary-light)] transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        {t('Back to Guarantees', 'العودة إلى الضمانات')}
      </Link>

      {/* Header Section */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-[var(--foreground)]">{guarantee.id}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusStyles[guarantee.status]}`}>
                {statusLabels[guarantee.status]}
              </span>
            </div>
            <p className="text-lg text-[var(--muted)]">{guarantee.type}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-[var(--muted)] mb-1">{t('Amount', 'المبلغ')}</p>
            <p className="text-3xl font-bold text-[var(--foreground)]">
              {formatAmount(guarantee.amount)} <span className="text-xl">{guarantee.currency}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Pending Signature Alert */}
      {currentUserPendingSignature && (
        <div className="bg-[var(--warning)] bg-opacity-10 border border-[var(--warning)] rounded-xl p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-[var(--warning)] mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 className="font-semibold text-[var(--foreground)] mb-1">
                  {t('Signature Required', 'التوقيع مطلوب')}
                </h3>
                <p className="text-[var(--muted)]">
                  {t('You need to sign this guarantee to activate it.', 'يجب عليك التوقيع على هذا الضمان لتفعيله.')}
                </p>
              </div>
            </div>
            <Link
              href={`/guarantees/${id}/sign`}
              className="px-6 py-2 bg-[var(--warning)] text-white rounded-lg font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              {t('Sign Now', 'وقّع الآن')}
            </Link>
          </div>
        </div>
      )}

      {/* Details Card */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-6">
        <h2 className="text-xl font-bold text-[var(--foreground)] mb-4">
          {t('Details', 'التفاصيل')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-[var(--muted)] mb-1">{t('Beneficiary', 'المستفيد')}</p>
            <p className="text-[var(--foreground)] font-medium">{guarantee.beneficiary}</p>
          </div>
          {guarantee.issuedDate && (
            <div>
              <p className="text-sm text-[var(--muted)] mb-1">{t('Issued Date', 'تاريخ الإصدار')}</p>
              <p className="text-[var(--foreground)] font-medium">{formatDate(guarantee.issuedDate)}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-[var(--muted)] mb-1">{t('Expiry Date', 'تاريخ الانتهاء')}</p>
            <p className="text-[var(--foreground)] font-medium">{formatDate(guarantee.expiryDate)}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--muted)] mb-1">{t('Currency', 'العملة')}</p>
            <p className="text-[var(--foreground)] font-medium">{guarantee.currency}</p>
          </div>
        </div>
      </div>

      {/* Collateral Section */}
      {guarantee.collateral && guarantee.collateral.length > 0 && (
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-6">
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-4">
            {t('Collateral', 'الضمانات')}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--foreground)]">
                    {t('Type', 'النوع')}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--foreground)]">
                    {t('Value', 'القيمة')}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--foreground)]">
                    {t('Description', 'الوصف')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {guarantee.collateral.map((item, index) => (
                  <tr key={index} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-3 px-4 text-[var(--foreground)]">{item.type}</td>
                    <td className="py-3 px-4 text-[var(--foreground)] font-medium">
                      {formatAmount(item.value)} QAR
                    </td>
                    <td className="py-3 px-4 text-[var(--muted)]">{item.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Signatories Section */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-6">
        <h2 className="text-xl font-bold text-[var(--foreground)] mb-4">
          {t('Signatories', 'الموقعون')}
        </h2>
        <div className="space-y-3">
          {guarantee.signatories.map((signatory, index) => {
            const person = getPersonById(signatory.personId);
            return (
              <div key={index} className="flex items-center justify-between p-4 bg-[var(--background)] rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    signatory.signed ? 'bg-[var(--success)]' : 'bg-[var(--warning)]'
                  }`}>
                    {signatory.signed ? (
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-[var(--foreground)]">
                      {person?.fullNameEn || t('Unknown', 'غير معروف')}
                    </p>
                    <p className="text-sm text-[var(--muted)]">
                      {person?.fullNameAr}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {signatory.signed ? (
                    <>
                      <p className="text-sm font-medium text-[var(--success)]">
                        {t('Signed', 'تم التوقيع')}
                      </p>
                      {signatory.signedAt && (
                        <p className="text-xs text-[var(--muted)]">
                          {formatDate(signatory.signedAt)}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm font-medium text-[var(--warning)]">
                      {t('Pending', 'قيد الانتظار')}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Claims Section */}
      {claims.length > 0 && (
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-6">
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-4">
            {t('Claims', 'المطالبات')}
          </h2>
          <div className="space-y-3">
            {claims.map((claim) => {
              const claimStatusStyles = {
                filed: 'bg-[var(--accent)]',
                under_review: 'bg-[var(--warning)]',
                approved: 'bg-[var(--success)]',
                rejected: 'bg-[var(--danger)]',
              };
              const claimStatusLabels = {
                filed: t('Filed', 'مقدمة'),
                under_review: t('Under Review', 'قيد المراجعة'),
                approved: t('Approved', 'موافق عليها'),
                rejected: t('Rejected', 'مرفوضة'),
              };
              return (
                <div key={claim.id} className="flex items-center justify-between p-4 bg-[var(--background)] rounded-lg">
                  <div>
                    <p className="font-medium text-[var(--foreground)]">{claim.id}</p>
                    <p className="text-sm text-[var(--muted)]">
                      {t('Filed on', 'مقدمة في')} {formatDate(claim.filedAt)}
                    </p>
                  </div>
                  <div className="text-right flex items-center gap-4">
                    <div>
                      <p className="font-semibold text-[var(--foreground)]">
                        {formatAmount(claim.amount)} QAR
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${claimStatusStyles[claim.status]}`}>
                      {claimStatusLabels[claim.status]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cross-Portal Link */}
      {relatedLoan && (
        <Link
          href={`/financing/loans/${relatedLoan.id}`}
          className="block bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-6 hover:border-[var(--primary)] transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--muted)] mb-1">
                {t('Related Loan', 'القرض المرتبط')}
              </p>
              <p className="text-lg font-semibold text-[var(--foreground)]">{relatedLoan.id}</p>
              <p className="text-sm text-[var(--muted)]">{relatedLoan.type}</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-[var(--foreground)]">
                {formatAmount(relatedLoan.outstandingBalance)} QAR
              </p>
              <p className="text-sm text-[var(--muted)]">
                {t('Outstanding', 'المتبقي')}
              </p>
            </div>
          </div>
        </Link>
      )}

      {/* Documents Section */}
      {documents.length > 0 && (
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-6">
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-4">
            {t('Related Documents', 'المستندات المرتبطة')}
          </h2>
          <div className="space-y-3">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-4 bg-[var(--background)] rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-[var(--primary)] bg-opacity-10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-[var(--foreground)]">{doc.name}</p>
                    <p className="text-sm text-[var(--muted)]">{doc.type} • {doc.size}</p>
                  </div>
                </div>
                <button className="text-[var(--primary)] hover:text-[var(--primary-light)] transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
