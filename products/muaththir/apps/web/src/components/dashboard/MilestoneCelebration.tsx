'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface MilestoneCelebrationProps {
  visible: boolean;
  milestoneName: string;
  dimensionName: string;
  onClose: () => void;
}

/**
 * A celebration overlay shown when a milestone is achieved.
 * Includes confetti-like CSS animation, milestone details,
 * and a share button that copies text to clipboard.
 */
export default function MilestoneCelebration({
  visible,
  milestoneName,
  dimensionName,
  onClose,
}: MilestoneCelebrationProps) {
  const t = useTranslations('celebration');
  const [copied, setCopied] = useState(false);

  // Reset copied state when component becomes visible
  useEffect(() => {
    if (visible) setCopied(false);
  }, [visible]);

  if (!visible) return null;

  const handleShare = async () => {
    const text = `${t('milestoneAchieved')} ${milestoneName} (${dimensionName}) - Mu'aththir`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // Fallback: do nothing if clipboard is unavailable
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      {/* Confetti animation */}
      <div
        data-testid="celebration-animation"
        className="absolute inset-0 pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        {Array.from({ length: 24 }).map((_, i) => (
          <span
            key={i}
            className="absolute block rounded-sm"
            style={{
              width: `${6 + Math.random() * 8}px`,
              height: `${6 + Math.random() * 8}px`,
              left: `${Math.random() * 100}%`,
              top: '-10px',
              backgroundColor: [
                '#10B981', '#3B82F6', '#EC4899', '#F59E0B',
                '#8B5CF6', '#EF4444', '#06B6D4', '#F97316',
              ][i % 8],
              animation: `confetti-fall ${1.5 + Math.random() * 2}s ease-in ${Math.random() * 0.8}s forwards`,
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          />
        ))}
        <style>{`
          @keyframes confetti-fall {
            0% {
              opacity: 1;
              transform: translateY(0) rotate(0deg) scale(1);
            }
            100% {
              opacity: 0;
              transform: translateY(100vh) rotate(720deg) scale(0.5);
            }
          }
        `}</style>
      </div>

      {/* Celebration card */}
      <div className="relative card max-w-sm mx-4 text-center p-8 shadow-2xl animate-bounce-once">
        {/* Trophy icon */}
        <div className="mx-auto h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
          <svg
            className="h-8 w-8 text-amber-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
            />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          {t('congratulations')}
        </h2>

        <p className="text-sm text-slate-700 dark:text-slate-300 mb-1">
          {t('achievedMilestone', { name: milestoneName })}
        </p>

        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
          {t('dimension', { dimension: dimensionName })}
        </p>

        {/* Share button */}
        <button
          onClick={handleShare}
          className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl text-sm transition-colors mb-3"
        >
          {copied ? t('copied') : t('shareAchievement')}
        </button>

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl text-sm transition-colors"
        >
          {t('close')}
        </button>
      </div>
    </div>
  );
}
