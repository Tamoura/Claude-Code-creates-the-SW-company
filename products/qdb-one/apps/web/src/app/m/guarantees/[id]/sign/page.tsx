'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getGuaranteeById } from '@/data/guarantees';
import { useParams, useRouter } from 'next/navigation';
import MobileHeader from '@/components/mobile/MobileHeader';
import MobileCard from '@/components/mobile/MobileCard';

export default function MobileGuaranteeSignPage() {
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
      <div>
        <MobileHeader title={t('Sign', '\u0627\u0644\u062A\u0648\u0642\u064A\u0639')} showBack />
        <div className="px-4 py-12 text-center text-sm text-[var(--muted)]">
          {t('Guarantee not found', '\u0627\u0644\u0636\u0645\u0627\u0646 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F')}
        </div>
      </div>
    );
  }

  const formatAmount = (amount: number) => new Intl.NumberFormat('en-QA').format(amount);
  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-QA');

  const handleVerify = async () => {
    setVerifying(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setVerifying(false);
    setStep(2);
  };

  const handleSign = async () => {
    setSigning(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSigning(false);
    setSigned(true);
  };

  const steps = [
    { number: 1, label: t('Verify', '\u0627\u0644\u062A\u062D\u0642\u0642') },
    { number: 2, label: t('Review', '\u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629') },
    { number: 3, label: t('Sign', '\u0627\u0644\u062A\u0648\u0642\u064A\u0639') },
  ];

  return (
    <div>
      <MobileHeader title={t('Sign Guarantee', '\u062A\u0648\u0642\u064A\u0639 \u0627\u0644\u0636\u0645\u0627\u0646')} showBack />
      <div className="px-4 py-4 space-y-4">
        {/* Progress */}
        <div className="flex items-center justify-between px-2">
          {steps.map((s, i) => (
            <div key={s.number} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  step >= s.number ? 'bg-[var(--primary)] text-white' : 'bg-gray-200 text-[var(--muted)]'
                }`}>
                  {s.number}
                </div>
                <span className="text-[10px] mt-1 text-[var(--muted)]">{s.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`h-0.5 flex-1 mx-2 ${step > s.number ? 'bg-[var(--primary)]' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Verify */}
        {step === 1 && (
          <MobileCard className="text-center py-8">
            <div className="w-16 h-16 mx-auto rounded-full bg-[var(--primary)]/10 flex items-center justify-center mb-4">
              <span className="text-2xl">{'\u{1F6E1}'}</span>
            </div>
            <h2 className="text-base font-bold mb-1">{t('Identity Verification', '\u0627\u0644\u062A\u062D\u0642\u0642 \u0645\u0646 \u0627\u0644\u0647\u0648\u064A\u0629')}</h2>
            <p className="text-xs text-[var(--muted)] mb-6">{t('Verify via NAS', '\u0627\u0644\u062A\u062D\u0642\u0642 \u0639\u0628\u0631 NAS')}</p>
            <button
              onClick={handleVerify}
              disabled={verifying}
              className="w-full py-3 bg-[var(--primary)] text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {verifying ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{t('Verifying...', '\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062D\u0642\u0642...')}</>
              ) : (
                t('Verify via NAS', '\u0627\u0644\u062A\u062D\u0642\u0642 \u0639\u0628\u0631 NAS')
              )}
            </button>
          </MobileCard>
        )}

        {/* Step 2: Review */}
        {step === 2 && (
          <>
            <MobileCard>
              <h2 className="text-sm font-semibold mb-3">{t('Guarantee Summary', '\u0645\u0644\u062E\u0635 \u0627\u0644\u0636\u0645\u0627\u0646')}</h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] text-[var(--muted)]">{t('Type', '\u0627\u0644\u0646\u0648\u0639')}</div>
                  <div className="text-sm font-medium">{guarantee.type}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[var(--muted)]">{t('Amount', '\u0627\u0644\u0645\u0628\u0644\u063A')}</div>
                  <div className="text-sm font-medium">{formatAmount(guarantee.amount)} {guarantee.currency}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[var(--muted)]">{t('Beneficiary', '\u0627\u0644\u0645\u0633\u062A\u0641\u064A\u062F')}</div>
                  <div className="text-sm font-medium">{guarantee.beneficiary}</div>
                </div>
                <div>
                  <div className="text-[10px] text-[var(--muted)]">{t('Expiry', '\u0627\u0644\u0627\u0646\u062A\u0647\u0627\u0621')}</div>
                  <div className="text-sm font-medium">{formatDate(guarantee.expiryDate)}</div>
                </div>
              </div>
            </MobileCard>

            <MobileCard className="bg-gray-50 border-dashed text-center py-6">
              <span className="text-3xl">{'\u{1F4C4}'}</span>
              <p className="text-xs text-[var(--muted)] mt-2">{t('Document Preview', '\u0645\u0639\u0627\u064A\u0646\u0629 \u0627\u0644\u0645\u0633\u062A\u0646\u062F')}</p>
            </MobileCard>

            <label className="flex items-start gap-3 px-1">
              <input
                type="checkbox"
                checked={reviewed}
                onChange={e => setReviewed(e.target.checked)}
                className="mt-1 w-5 h-5"
              />
              <div>
                <p className="text-sm font-medium">{t('I have reviewed the document', '\u0644\u0642\u062F \u0631\u0627\u062C\u0639\u062A \u0627\u0644\u0645\u0633\u062A\u0646\u062F')}</p>
                <p className="text-[10px] text-[var(--muted)] mt-0.5">{t('Confirm you understand the agreement', '\u0623\u0624\u0643\u062F \u0641\u0647\u0645\u0643 \u0644\u0644\u0627\u062A\u0641\u0627\u0642\u064A\u0629')}</p>
              </div>
            </label>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-3 border border-[var(--border)] rounded-xl text-sm font-medium">
                {t('Back', '\u0631\u062C\u0648\u0639')}
              </button>
              <button
                onClick={() => reviewed && setStep(3)}
                disabled={!reviewed}
                className="flex-1 py-3 bg-[var(--primary)] text-white rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {t('Continue', '\u0645\u062A\u0627\u0628\u0639\u0629')}
              </button>
            </div>
          </>
        )}

        {/* Step 3: Sign */}
        {step === 3 && (
          <MobileCard className="text-center py-8">
            {!signed ? (
              <>
                <div className="w-16 h-16 mx-auto rounded-full bg-[var(--primary)]/10 flex items-center justify-center mb-4">
                  <span className="text-2xl">{'\u270D\uFE0F'}</span>
                </div>
                <h2 className="text-base font-bold mb-1">{t('Digital Signature', '\u0627\u0644\u062A\u0648\u0642\u064A\u0639 \u0627\u0644\u0631\u0642\u0645\u064A')}</h2>
                <p className="text-xs text-[var(--muted)] mb-6">{t('Tap to sign digitally', '\u0627\u0646\u0642\u0631 \u0644\u0644\u062A\u0648\u0642\u064A\u0639 \u0631\u0642\u0645\u064A\u0627\u064B')}</p>
                <button
                  onClick={handleSign}
                  disabled={signing}
                  className="w-full py-3 bg-[var(--primary)] text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {signing ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{t('Signing...', '\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u0648\u0642\u064A\u0639...')}</>
                  ) : (
                    t('Sign Guarantee', '\u062A\u0648\u0642\u064A\u0639 \u0627\u0644\u0636\u0645\u0627\u0646')
                  )}
                </button>
                <button onClick={() => setStep(2)} className="mt-3 text-xs text-[var(--muted)]">
                  {t('Back to Review', '\u0627\u0644\u0639\u0648\u062F\u0629 \u0644\u0644\u0645\u0631\u0627\u062C\u0639\u0629')}
                </button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 mx-auto rounded-full bg-[var(--success)] flex items-center justify-center mb-4">
                  <span className="text-2xl text-white">✓</span>
                </div>
                <h2 className="text-base font-bold text-[var(--success)] mb-1">{t('Signed Successfully', '\u062A\u0645 \u0627\u0644\u062A\u0648\u0642\u064A\u0639 \u0628\u0646\u062C\u0627\u062D')}</h2>
                <p className="text-xs text-[var(--muted)] mb-6">{t('Your signature has been applied.', '\u062A\u0645 \u062A\u0637\u0628\u064A\u0642 \u062A\u0648\u0642\u064A\u0639\u0643.')}</p>
                <button
                  onClick={() => router.push(`/m/guarantees/${id}`)}
                  className="w-full py-3 bg-[var(--primary)] text-white rounded-xl font-medium"
                >
                  {t('Return to Guarantee', '\u0627\u0644\u0639\u0648\u062F\u0629 \u0625\u0644\u0649 \u0627\u0644\u0636\u0645\u0627\u0646')}
                </button>
              </>
            )}
          </MobileCard>
        )}
      </div>
    </div>
  );
}
