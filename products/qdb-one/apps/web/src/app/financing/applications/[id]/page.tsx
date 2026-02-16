'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getApplicationById } from '@/data/financing';
import { getDocumentsByRecord } from '@/data/documents';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, FileText, AlertCircle } from 'lucide-react';

export default function ApplicationDetailPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const params = useParams();

  if (!user) return null;

  const application = getApplicationById(params.id as string);

  if (!application) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-[var(--danger)]" />
            <h2 className="text-xl font-semibold mb-2">
              {t('Application Not Found', 'الطلب غير موجود')}
            </h2>
            <p className="text-[var(--muted)] mb-6">
              {t(
                'The application you are looking for does not exist or you do not have permission to view it.',
                'الطلب الذي تبحث عنه غير موجود أو ليس لديك صلاحية لعرضه.'
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

  const documents = getDocumentsByRecord(application.id);

  // Get status colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'under_review':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft':
        return t('Draft', 'مسودة');
      case 'submitted':
        return t('Submitted', 'مقدم');
      case 'under_review':
        return t('Under Review', 'قيد المراجعة');
      case 'approved':
        return t('Approved', 'موافق عليه');
      case 'rejected':
        return t('Rejected', 'مرفوض');
      default:
        return status;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-QA').format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-QA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Determine timeline step states
  const currentStepIndex = application.statusTimeline.length - 1;

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto space-y-6">
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

        {/* Application Header Card */}
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold mb-2">{application.id}</h1>
              <p className="text-[var(--muted)]">{application.type}</p>
            </div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
              {getStatusLabel(application.status)}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-[var(--border)]">
            <div>
              <p className="text-sm text-[var(--muted)] mb-1">
                {t('Amount', 'المبلغ')}
              </p>
              <p className="text-lg font-semibold">
                {formatCurrency(application.amount)} {application.currency}
              </p>
            </div>
            <div>
              <p className="text-sm text-[var(--muted)] mb-1">
                {t('Submitted', 'تاريخ التقديم')}
              </p>
              <p className="text-lg font-semibold">
                {formatDate(application.submittedAt)}
              </p>
            </div>
            <div>
              <p className="text-sm text-[var(--muted)] mb-1">
                {t('Application Type', 'نوع الطلب')}
              </p>
              <p className="text-lg font-semibold">{application.type}</p>
            </div>
          </div>
        </div>

        {/* Status Timeline */}
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-6">
          <h2 className="text-lg font-semibold mb-6">
            {t('Status Timeline', 'الجدول الزمني للحالة')}
          </h2>

          <div className="space-y-6">
            {application.statusTimeline.map((step, index) => {
              const isCompleted = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;
              const isFuture = index > currentStepIndex;

              return (
                <div key={index} className="flex gap-4">
                  {/* Timeline dot and line */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-3 h-3 rounded-full border-2 ${
                        isCompleted
                          ? 'bg-[var(--primary)] border-[var(--primary)]'
                          : isCurrent
                          ? 'bg-[var(--warning)] border-[var(--warning)] animate-pulse'
                          : 'bg-transparent border-gray-300 dark:border-gray-600'
                      }`}
                    />
                    {index < application.statusTimeline.length - 1 && (
                      <div
                        className={`w-0.5 h-12 ${
                          isCompleted
                            ? 'bg-[var(--primary)]'
                            : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      />
                    )}
                  </div>

                  {/* Step content */}
                  <div className="flex-1 pb-8">
                    <div className="flex items-start justify-between">
                      <div>
                        <p
                          className={`font-medium ${
                            isFuture ? 'text-[var(--muted)]' : 'text-[var(--foreground)]'
                          }`}
                        >
                          {getStatusLabel(step.status)}
                        </p>
                        <p className="text-sm text-[var(--muted)] mt-1">
                          {formatDate(step.date)}
                        </p>
                        {step.note && (
                          <p className="text-sm mt-2 text-[var(--foreground)]">
                            {step.note}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Related Guarantee */}
        {application.relatedGuaranteeId && (
          <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-6">
            <h2 className="text-lg font-semibold mb-4">
              {t('Related Guarantee', 'الضمان المرتبط')}
            </h2>
            <Link
              href={`/guarantees/${application.relatedGuaranteeId}`}
              className="block p-4 rounded-lg border border-[var(--border)] hover:border-[var(--primary)] transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{application.relatedGuaranteeId}</p>
                  <p className="text-sm text-[var(--muted)] mt-1">
                    {t('View guarantee details', 'عرض تفاصيل الضمان')}
                  </p>
                </div>
                <ArrowLeft className="w-5 h-5 text-[var(--muted)] rotate-180" />
              </div>
            </Link>
          </div>
        )}

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
