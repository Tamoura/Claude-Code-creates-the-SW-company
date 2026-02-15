'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLoanById } from '@/data/financing';
import { getDocumentsByRecord } from '@/data/documents';
import Link from 'next/link';
import { ArrowLeft, FileText, AlertCircle, Calendar, TrendingUp } from 'lucide-react';

/**
 * Financing Loan Detail Page
 *
 * Displays comprehensive loan details including:
 * - Loan metadata (ID, type, amounts, rates, dates)
 * - Balance summary with progress visualization
 * - Payment schedule table
 * - Next payment highlight
 * - Related documents
 * - Cross-portal links to guarantees and advisory sessions
 *
 * Usage: /financing/loans/LN-2024-001
 */

interface PageProps {
  params: {
    id: string;
  };
}

export default function LoanDetailPage({ params }: PageProps) {
  const { user } = useAuth();
  const { t } = useLanguage();

  if (!user) return null;

  const loan = getLoanById(params.id);

  if (!loan) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-[var(--danger)]" />
            <h2 className="text-xl font-semibold mb-2">
              {t('Loan Not Found', 'القرض غير موجود')}
            </h2>
            <p className="text-[var(--muted)] mb-6">
              {t(
                'The loan you are looking for does not exist or you do not have permission to view it.',
                'القرض الذي تبحث عنه غير موجود أو ليس لديك صلاحية لعرضه.'
              )}
            </p>
            <Link
              href="/financing"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('Back to Financing', 'العودة إلى التمويل')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const documents = getDocumentsByRecord(loan.id);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-QA').format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-QA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'closed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
      case 'defaulted':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return t('Active', 'نشط');
      case 'closed':
        return t('Closed', 'مغلق');
      case 'defaulted':
        return t('Defaulted', 'متعثر');
      default:
        return status;
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getPaymentStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return t('Completed', 'مكتمل');
      case 'pending':
        return t('Pending', 'معلق');
      default:
        return status;
    }
  };

  // Calculate payment progress
  const paidAmount = loan.originalAmount - loan.outstandingBalance;
  const paymentProgress = (paidAmount / loan.originalAmount) * 100;

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/financing"
            className="inline-flex items-center gap-2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('Back to Financing', 'العودة إلى التمويل')}
          </Link>
        </div>

        {/* Loan Header Card */}
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold mb-2">{loan.id}</h1>
              <p className="text-[var(--muted)]">{loan.type}</p>
            </div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(loan.status)}`}>
              {getStatusLabel(loan.status)}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-[var(--border)]">
            <div>
              <p className="text-sm text-[var(--muted)] mb-1">
                {t('Original Amount', 'المبلغ الأصلي')}
              </p>
              <p className="text-lg font-semibold">
                {formatCurrency(loan.originalAmount)} {loan.currency}
              </p>
            </div>
            <div>
              <p className="text-sm text-[var(--muted)] mb-1">
                {t('Outstanding Balance', 'الرصيد المتبقي')}
              </p>
              <p className="text-lg font-semibold">
                {formatCurrency(loan.outstandingBalance)} {loan.currency}
              </p>
            </div>
            <div>
              <p className="text-sm text-[var(--muted)] mb-1">
                {t('Interest Rate', 'معدل الفائدة')}
              </p>
              <p className="text-lg font-semibold">{loan.interestRate}%</p>
            </div>
            <div>
              <p className="text-sm text-[var(--muted)] mb-1">
                {t('Maturity Date', 'تاريخ الاستحقاق')}
              </p>
              <p className="text-lg font-semibold">{formatDate(loan.maturityDate)}</p>
            </div>
          </div>
        </div>

        {/* Balance Summary Card */}
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            {t('Balance Summary', 'ملخص الرصيد')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <p className="text-sm text-[var(--muted)] mb-1">
                {t('Original Amount', 'المبلغ الأصلي')}
              </p>
              <p className="text-2xl font-bold">
                {formatCurrency(loan.originalAmount)} {loan.currency}
              </p>
            </div>
            <div>
              <p className="text-sm text-[var(--muted)] mb-1">
                {t('Paid So Far', 'المدفوع حتى الآن')}
              </p>
              <p className="text-2xl font-bold text-[var(--success)]">
                {formatCurrency(paidAmount)} {loan.currency}
              </p>
            </div>
            <div>
              <p className="text-sm text-[var(--muted)] mb-1">
                {t('Outstanding', 'المتبقي')}
              </p>
              <p className="text-2xl font-bold text-[var(--warning)]">
                {formatCurrency(loan.outstandingBalance)} {loan.currency}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-[var(--muted)]">
                {t('Payment Progress', 'تقدم السداد')}
              </p>
              <p className="text-sm font-medium">{paymentProgress.toFixed(1)}%</p>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className="bg-[var(--success)] h-3 rounded-full transition-all duration-300"
                style={{ width: `${paymentProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Next Payment Highlight */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-500 rounded-lg">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">
                {t('Next Payment Due', 'الدفعة القادمة المستحقة')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-[var(--muted)] mb-1">
                    {t('Payment Date', 'تاريخ الدفع')}
                  </p>
                  <p className="text-xl font-bold">{formatDate(loan.nextPaymentDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--muted)] mb-1">
                    {t('Payment Amount', 'مبلغ الدفع')}
                  </p>
                  <p className="text-xl font-bold">
                    {formatCurrency(loan.nextPaymentAmount)} {loan.currency}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Schedule Table */}
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-6">
          <h2 className="text-lg font-semibold mb-4">
            {t('Payment Schedule', 'جدول الدفعات')}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left py-3 px-4 text-sm font-medium text-[var(--muted)]">
                    {t('Payment ID', 'رقم الدفعة')}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-[var(--muted)]">
                    {t('Date', 'التاريخ')}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-[var(--muted)]">
                    {t('Amount', 'المبلغ')}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-[var(--muted)]">
                    {t('Status', 'الحالة')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {loan.payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-[var(--border)] hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-3 px-4 text-sm font-medium">{payment.id}</td>
                    <td className="py-3 px-4 text-sm">{formatDate(payment.date)}</td>
                    <td className="py-3 px-4 text-sm font-semibold">
                      {formatCurrency(payment.amount)} {loan.currency}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(payment.status)}`}>
                        {getPaymentStatusLabel(payment.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cross-Portal Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Related Guarantee */}
          {loan.relatedGuaranteeId && (
            <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-6">
              <h2 className="text-lg font-semibold mb-4">
                {t('Related Guarantee', 'الضمان المرتبط')}
              </h2>
              <Link
                href={`/guarantees/${loan.relatedGuaranteeId}`}
                className="block p-4 rounded-lg border border-[var(--border)] hover:border-[var(--primary)] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{loan.relatedGuaranteeId}</p>
                    <p className="text-sm text-[var(--muted)] mt-1">
                      {t('View guarantee details', 'عرض تفاصيل الضمان')}
                    </p>
                  </div>
                  <ArrowLeft className="w-5 h-5 text-[var(--muted)] rotate-180" />
                </div>
              </Link>
            </div>
          )}

          {/* Related Advisory Session */}
          {loan.relatedAdvisorySessionId && (
            <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-6">
              <h2 className="text-lg font-semibold mb-4">
                {t('Related Advisory Session', 'الجلسة الاستشارية المرتبطة')}
              </h2>
              <Link
                href={`/advisory/sessions/${loan.relatedAdvisorySessionId}`}
                className="block p-4 rounded-lg border border-[var(--border)] hover:border-[var(--primary)] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{loan.relatedAdvisorySessionId}</p>
                    <p className="text-sm text-[var(--muted)] mt-1">
                      {t('View session details', 'عرض تفاصيل الجلسة')}
                    </p>
                  </div>
                  <ArrowLeft className="w-5 h-5 text-[var(--muted)] rotate-180" />
                </div>
              </Link>
            </div>
          )}
        </div>

        {/* Related Documents */}
        {documents.length > 0 && (
          <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-6">
            <h2 className="text-lg font-semibold mb-4">
              {t('Related Documents', 'المستندات المرتبطة')}
            </h2>
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-start gap-3 p-4 rounded-lg border border-[var(--border)] hover:border-[var(--primary)] transition-colors"
                >
                  <FileText className="w-5 h-5 text-[var(--primary)] mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{doc.name}</p>
                    <div className="flex items-center gap-3 mt-1 text-sm text-[var(--muted)]">
                      <span>{doc.type}</span>
                      <span>•</span>
                      <span>{doc.size}</span>
                      <span>•</span>
                      <span>{formatDate(doc.uploadedAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
