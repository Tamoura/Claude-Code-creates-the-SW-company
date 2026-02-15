'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getGuaranteeById } from '@/data/guarantees';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

export default function GuaranteeSignPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [step, setStep] = useState(1);
  const [verifying, setVerifying] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);

  if (!user) return null;

  const guarantee = getGuaranteeById(id);
  if (!guarantee) {
    return (
      <div className="p-6">
        <p className="text-[var(--muted)]">{t('Guarantee not found', 'الضمان غير موجود')}</p>
      </div>
    );
  }

  const formatAmount = (amount: number) => new Intl.NumberFormat('en-QA').format(amount);
  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-QA');

  const handleVerify = async () => {
    setVerifying(true);
    // Simulate NAS verification delay
    await new Promise(resolve => setTimeout(resolve, 800));
    setVerifying(false);
    setStep(2);
  };

  const handleProceedToSign = () => {
    if (reviewed) {
      setStep(3);
    }
  };

  const handleSign = async () => {
    setSigning(true);
    // Simulate signing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSigning(false);
    setSigned(true);
  };

  const handleReturnToGuarantee = () => {
    router.push(`/guarantees/${id}`);
  };

  // Progress steps
  const steps = [
    { number: 1, label: t('Verify Identity', 'التحقق من الهوية') },
    { number: 2, label: t('Review Document', 'مراجعة المستند') },
    { number: 3, label: t('Sign', 'التوقيع') },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <Link
        href={`/guarantees/${id}`}
        className="inline-flex items-center gap-2 text-[var(--primary)] hover:text-[var(--primary-light)] transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        {t('Back to Guarantee', 'العودة إلى الضمان')}
      </Link>

      {/* Header */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-6">
        <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">
          {t('Sign Guarantee', 'توقيع الضمان')}
        </h1>
        <p className="text-[var(--muted)]">{guarantee.id} - {guarantee.type}</p>
      </div>

      {/* Progress Indicator */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-6">
        <div className="flex items-center justify-between">
          {steps.map((s, index) => (
            <div key={s.number} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step >= s.number
                    ? 'bg-[var(--primary)] text-white'
                    : 'bg-[var(--muted)] bg-opacity-20 text-[var(--muted)]'
                }`}>
                  {s.number}
                </div>
                <p className={`text-sm mt-2 text-center ${
                  step >= s.number ? 'text-[var(--foreground)] font-medium' : 'text-[var(--muted)]'
                }`}>
                  {s.label}
                </p>
              </div>
              {index < steps.length - 1 && (
                <div className={`h-0.5 flex-1 mx-4 ${
                  step > s.number ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      {step === 1 && (
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-6">
          <div className="text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-[var(--primary)] bg-opacity-10 flex items-center justify-center">
              <svg className="w-10 h-10 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--foreground)] mb-2">
                {t('Step-up Authentication Required', 'مطلوب مصادقة إضافية')}
              </h2>
              <p className="text-[var(--muted)]">
                {t(
                  'For your security, we need to verify your identity using the National Authentication System (NAS).',
                  'لأمانك، نحتاج للتحقق من هويتك باستخدام نظام المصادقة الوطني (NAS).'
                )}
              </p>
            </div>
            <button
              onClick={handleVerify}
              disabled={verifying}
              className="px-8 py-3 bg-[var(--primary)] text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {verifying ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('Verifying...', 'جاري التحقق...')}
                </span>
              ) : (
                t('Verify via NAS', 'التحقق عبر NAS')
              )}
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          {/* Guarantee Summary */}
          <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-6">
            <h2 className="text-xl font-bold text-[var(--foreground)] mb-4">
              {t('Guarantee Summary', 'ملخص الضمان')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-[var(--muted)] mb-1">{t('Type', 'النوع')}</p>
                <p className="text-[var(--foreground)] font-medium">{guarantee.type}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--muted)] mb-1">{t('Amount', 'المبلغ')}</p>
                <p className="text-[var(--foreground)] font-medium">
                  {formatAmount(guarantee.amount)} {guarantee.currency}
                </p>
              </div>
              <div>
                <p className="text-sm text-[var(--muted)] mb-1">{t('Beneficiary', 'المستفيد')}</p>
                <p className="text-[var(--foreground)] font-medium">{guarantee.beneficiary}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--muted)] mb-1">{t('Expiry Date', 'تاريخ الانتهاء')}</p>
                <p className="text-[var(--foreground)] font-medium">{formatDate(guarantee.expiryDate)}</p>
              </div>
            </div>
          </div>

          {/* Document Preview */}
          <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-6">
            <h2 className="text-xl font-bold text-[var(--foreground)] mb-4">
              {t('Document Preview', 'معاينة المستند')}
            </h2>
            <div className="bg-[var(--muted)] bg-opacity-10 rounded-lg p-12 text-center border-2 border-dashed border-[var(--border)]">
              <div className="w-16 h-16 mx-auto mb-4 rounded bg-[var(--primary)] bg-opacity-10 flex items-center justify-center">
                <svg className="w-8 h-8 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-[var(--foreground)] font-medium mb-2">
                {t('Guarantee Agreement Document Preview', 'معاينة مستند اتفاقية الضمان')}
              </p>
              <p className="text-sm text-[var(--muted)]">
                {guarantee.id} - {guarantee.type}
              </p>
            </div>
          </div>

          {/* Review Checkbox */}
          <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={reviewed}
                onChange={(e) => setReviewed(e.target.checked)}
                className="mt-1 w-5 h-5 text-[var(--primary)] rounded border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)]"
              />
              <div>
                <p className="text-[var(--foreground)] font-medium">
                  {t('I have reviewed the document', 'لقد راجعت المستند')}
                </p>
                <p className="text-sm text-[var(--muted)] mt-1">
                  {t(
                    'By checking this box, you confirm that you have carefully read and understood the guarantee agreement document.',
                    'بوضع علامة في هذا المربع، فإنك تؤكد أنك قد قرأت وفهمت مستند اتفاقية الضمان بعناية.'
                  )}
                </p>
              </div>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-3 border border-[var(--border)] text-[var(--foreground)] rounded-lg font-medium hover:bg-[var(--muted)] hover:bg-opacity-10 transition-colors"
            >
              {t('Back', 'رجوع')}
            </button>
            <button
              onClick={handleProceedToSign}
              disabled={!reviewed}
              className="flex-1 px-6 py-3 bg-[var(--primary)] text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('Proceed to Sign', 'المتابعة للتوقيع')}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-6">
          <div className="text-center space-y-6">
            {!signed ? (
              <>
                <div className="w-20 h-20 mx-auto rounded-full bg-[var(--primary)] bg-opacity-10 flex items-center justify-center">
                  <svg className="w-10 h-10 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[var(--foreground)] mb-2">
                    {t('Digital Signature', 'التوقيع الرقمي')}
                  </h2>
                  <p className="text-[var(--muted)]">
                    {t(
                      'Click the button below to digitally sign this guarantee agreement.',
                      'انقر على الزر أدناه لتوقيع اتفاقية الضمان رقمياً.'
                    )}
                  </p>
                </div>
                <div className="space-y-3">
                  <button
                    onClick={handleSign}
                    disabled={signing}
                    className="px-8 py-3 bg-[var(--primary)] text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {signing ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {t('Signing...', 'جاري التوقيع...')}
                      </span>
                    ) : (
                      t('Sign Guarantee', 'توقيع الضمان')
                    )}
                  </button>
                  <button
                    onClick={() => setStep(2)}
                    disabled={signing}
                    className="block mx-auto px-6 py-2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors disabled:opacity-50"
                  >
                    {t('Back to Review', 'العودة للمراجعة')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="w-20 h-20 mx-auto rounded-full bg-[var(--success)] flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[var(--success)] mb-2">
                    {t('Successfully Signed', 'تم التوقيع بنجاح')}
                  </h2>
                  <p className="text-[var(--muted)]">
                    {t(
                      'Your digital signature has been successfully applied to this guarantee agreement.',
                      'تم تطبيق توقيعك الرقمي بنجاح على اتفاقية الضمان هذه.'
                    )}
                  </p>
                </div>
                <button
                  onClick={handleReturnToGuarantee}
                  className="px-8 py-3 bg-[var(--primary)] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  {t('Return to Guarantee', 'العودة إلى الضمان')}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
