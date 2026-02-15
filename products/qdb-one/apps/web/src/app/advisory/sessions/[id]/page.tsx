'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { advisorySessions, getProgramById } from '@/data/advisory';
import Link from 'next/link';
import { Calendar, Clock, User, FileText, AlertCircle } from 'lucide-react';

export default function SessionDetailPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [isCancelled, setIsCancelled] = useState(false);

  if (!user) return null;

  const session = advisorySessions.find(s => s.id === params.id);
  if (!session) {
    return (
      <div className="p-8">
        <p className="text-[var(--muted)]">{t('Session not found', 'الجلسة غير موجودة')}</p>
        <Link href="/advisory" className="text-[var(--primary)] hover:underline mt-4 inline-block">
          {t('← Back to Advisory', '→ العودة للاستشارات')}
        </Link>
      </div>
    );
  }

  const program = getProgramById(session.programId);
  const actualStatus = isCancelled ? 'cancelled' : session.status;

  const statusColors = {
    scheduled: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700'
  };

  const statusLabels = {
    scheduled: t('Scheduled', 'مجدولة'),
    completed: t('Completed', 'مكتملة'),
    cancelled: t('Cancelled', 'ملغاة')
  };

  const handleCancelSession = () => {
    if (confirm(t('Are you sure you want to cancel this session?', 'هل أنت متأكد من إلغاء هذه الجلسة؟'))) {
      setIsCancelled(true);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Back button */}
      <Link
        href="/advisory"
        className="text-[var(--primary)] hover:underline mb-6 inline-block"
      >
        {t('← Back to Advisory', '→ العودة للاستشارات')}
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-3xl font-bold text-[var(--foreground)]">
            {session.topic}
          </h1>
          <span className={`px-4 py-2 rounded-full text-sm font-medium flex-shrink-0 ${statusColors[actualStatus]}`}>
            {statusLabels[actualStatus]}
          </span>
        </div>
      </div>

      {/* Details Card */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-6 mb-8">
        <h2 className="text-xl font-semibold mb-6 text-[var(--foreground)]">
          {t('Session Details', 'تفاصيل الجلسة')}
        </h2>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <User className="w-5 h-5 text-[var(--muted)] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-[var(--muted)] mb-1">{t('Advisor', 'المستشار')}</p>
              <p className="text-[var(--foreground)] font-medium">{session.advisorName}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-[var(--muted)] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-[var(--muted)] mb-1">{t('Date', 'التاريخ')}</p>
              <p className="text-[var(--foreground)] font-medium">
                {new Date(session.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-[var(--muted)] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-[var(--muted)] mb-1">{t('Time', 'الوقت')}</p>
              <p className="text-[var(--foreground)] font-medium">{session.time}</p>
            </div>
          </div>

          {program && (
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-[var(--muted)] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-[var(--muted)] mb-1">{t('Program', 'البرنامج')}</p>
                <Link
                  href={`/advisory/programs/${program.id}`}
                  className="text-[var(--primary)] hover:underline font-medium"
                >
                  {t(program.nameEn, program.nameAr)}
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Materials Section */}
      {session.materials && session.materials.length > 0 && (
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-6 mb-8">
          <h2 className="text-xl font-semibold mb-6 text-[var(--foreground)]">
            {t('Session Materials', 'مواد الجلسة')}
          </h2>
          <div className="space-y-3">
            {session.materials.map((material, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 border border-[var(--border)] rounded-lg hover:bg-[var(--primary-light)] transition-colors cursor-pointer"
              >
                <FileText className="w-5 h-5 text-[var(--primary)]" />
                <span className="text-[var(--foreground)] font-medium">{material}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes Section */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-6 mb-8">
        <h2 className="text-xl font-semibold mb-6 text-[var(--foreground)]">
          {t('Session Notes', 'ملاحظات الجلسة')}
        </h2>
        {session.notes ? (
          <div className="bg-[var(--primary-light)] p-4 rounded-lg">
            <p className="text-[var(--foreground)] leading-relaxed">{session.notes}</p>
          </div>
        ) : (
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
            <AlertCircle className="w-5 h-5 text-[var(--muted)] mt-0.5 flex-shrink-0" />
            <p className="text-[var(--muted)]">
              {t('Notes will be available after the session is completed.', 'ستتوفر الملاحظات بعد إتمام الجلسة.')}
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      {actualStatus === 'scheduled' && !isCancelled && (
        <div className="flex justify-end">
          <button
            onClick={handleCancelSession}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            {t('Cancel Session', 'إلغاء الجلسة')}
          </button>
        </div>
      )}

      {isCancelled && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-red-700">
            {t('This session has been cancelled.', 'تم إلغاء هذه الجلسة.')}
          </p>
        </div>
      )}
    </div>
  );
}
