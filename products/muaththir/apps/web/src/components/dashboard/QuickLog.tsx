'use client';

import { useState, FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { apiClient } from '../../lib/api-client';
import { DIMENSIONS } from '../../lib/dimensions';

interface QuickLogProps {
  childId: string;
  onSuccess?: () => void;
}

export default function QuickLog({ childId, onSuccess }: QuickLogProps) {
  const t = useTranslations('dashboard');
  const td = useTranslations('dimensions');

  const [dimension, setDimension] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!dimension || !content.trim()) {
      setError('Please select a dimension and enter content');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await apiClient.createObservation(childId, {
        dimension,
        content: content.trim(),
        sentiment: 'neutral',
      });

      // Show success message
      setShowSuccess(true);

      // Reset form
      setDimension('');
      setContent('');

      // Call success callback
      if (onSuccess) {
        onSuccess();
      }

      // Hide success message after 2 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save observation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card">
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-3">
        {t('quickLog')}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={dimension}
            onChange={(e) => setDimension(e.target.value)}
            disabled={isSubmitting}
            className="input-field flex-shrink-0 sm:w-48 text-sm dark:bg-slate-700 dark:text-white"
            aria-label={t('quickLogDimension')}
          >
            <option value="">{t('quickLogDimension')}</option>
            {DIMENSIONS.map((dim) => (
              <option key={dim.slug} value={dim.slug}>
                {td(dim.slug as any)}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('quickLogPlaceholder')}
            disabled={isSubmitting}
            className="input-field flex-1 text-sm dark:bg-slate-700 dark:text-white dark:placeholder-slate-400"
            maxLength={200}
            aria-label={t('quickLogPlaceholder')}
          />

          <button
            type="submit"
            disabled={isSubmitting || !dimension || !content.trim()}
            className="btn-primary px-4 py-2 text-sm whitespace-nowrap dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            {isSubmitting ? t('saving') : t('quickLogSubmit')}
          </button>
        </div>

        {error && (
          <p className="text-xs text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}

        {showSuccess && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium" role="status">
            {t('quickLogSuccess')}
          </p>
        )}
      </form>
    </div>
  );
}
