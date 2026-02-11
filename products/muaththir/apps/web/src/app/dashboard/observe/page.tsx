'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { DIMENSIONS } from '../../../lib/dimensions';
import { apiClient, type Child } from '../../../lib/api-client';

const sentiments = [
  { value: 'positive', label: 'Positive', emoji: 'Positive', colour: '#10B981' },
  { value: 'neutral', label: 'Neutral', emoji: 'Neutral', colour: '#94A3B8' },
  { value: 'needs_attention', label: 'Needs Attention', emoji: 'Attention', colour: '#F59E0B' },
] as const;

export default function ObservePage() {
  const t = useTranslations('observe');
  const tc = useTranslations('common');
  const td = useTranslations('dimensions');
  const router = useRouter();
  const [selectedDimension, setSelectedDimension] = useState<string>('');
  const [text, setText] = useState('');
  const [sentiment, setSentiment] = useState<string>('');
  const [observedAt, setObservedAt] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  const charCount = text.length;
  const charLimit = 1000;

  // Fetch children on mount
  useEffect(() => {
    const fetchChildren = async () => {
      try {
        setIsLoading(true);
        const response = await apiClient.getChildren(1, 50);
        setChildren(response.data);

        // If only one child, select automatically
        if (response.data.length === 1) {
          setSelectedChildId(response.data[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load children');
      } finally {
        setIsLoading(false);
      }
    };

    fetchChildren();
  }, []);

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && tags.length < 5 && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedChildId) {
      setError(t('pleaseSelectChild'));
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccessMessage('');

    try {
      await apiClient.createObservation(selectedChildId, {
        dimension: selectedDimension,
        content: text,
        sentiment,
        observedAt,
        tags,
      });

      setSuccessMessage(t('observationSaved'));

      // Redirect to timeline after a short delay
      setTimeout(() => {
        router.push('/dashboard/timeline');
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save observation');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="card py-12 text-center">
          <div className="h-6 w-32 bg-slate-200 rounded mx-auto animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {t('title')}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {t('subtitle')}
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
          <p className="text-sm text-emerald-800">{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* No children state */}
      {children.length === 0 && (
        <div className="card text-center py-12">
          <h3 className="text-sm font-medium text-slate-900 mb-1">
            {t('noChildrenFound')}
          </h3>
          <p className="text-xs text-slate-500">
            {t('noChildrenDesc')}
          </p>
        </div>
      )}

      {children.length > 0 && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Child Selector (if multiple children) */}
          {children.length > 1 && (
            <div>
              <label htmlFor="child-select" className="label">
                {t('selectChild')}
              </label>
              <select
                id="child-select"
                className="input-field"
                value={selectedChildId}
                onChange={(e) => setSelectedChildId(e.target.value)}
                required
              >
                <option value="">{tc('chooseChild')}</option>
                {children.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        {/* Dimension Selector */}
        <fieldset>
          <legend className="label mb-3">
            {t('selectDimension')}
          </legend>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {DIMENSIONS.map((dim) => (
              <button
                key={dim.slug}
                type="button"
                onClick={() => setSelectedDimension(dim.slug)}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  selectedDimension === dim.slug
                    ? 'shadow-sm'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                style={
                  selectedDimension === dim.slug
                    ? {
                        borderColor: dim.colour,
                        backgroundColor: `${dim.colour}08`,
                      }
                    : {}
                }
                aria-pressed={selectedDimension === dim.slug}
              >
                <span
                  className="block h-2 w-2 rounded-full mb-2"
                  style={{ backgroundColor: dim.colour }}
                  aria-hidden="true"
                />
                <span className="text-sm font-medium text-slate-900">
                  {td(dim.slug)}
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        {/* Observation Text */}
        <div>
          <label htmlFor="observation-text" className="label">
            {t('whatObserved')}
          </label>
          <textarea
            id="observation-text"
            rows={5}
            className="input-field resize-none"
            placeholder={t('observationPlaceholder')}
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, charLimit))}
            maxLength={charLimit}
            required
          />
          <p className="mt-1 text-xs text-slate-400 text-right">
            <span className={charCount > 900 ? 'text-amber-500' : ''}>
              {charCount}
            </span>
            /{charLimit}
          </p>
        </div>

        {/* Sentiment Selector */}
        <fieldset>
          <legend className="label mb-3">
            {t('howDescribe')}
          </legend>
          <div className="flex gap-3">
            {sentiments.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setSentiment(s.value)}
                className={`flex-1 p-3 rounded-xl border-2 text-center text-sm font-medium transition-all ${
                  sentiment === s.value
                    ? 'shadow-sm'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
                style={
                  sentiment === s.value
                    ? {
                        borderColor: s.colour,
                        backgroundColor: `${s.colour}10`,
                        color: s.colour,
                      }
                    : {}
                }
                aria-pressed={sentiment === s.value}
              >
                {t(s.value)}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Date Picker */}
        <div>
          <label htmlFor="observed-at" className="label">
            {t('dateObserved')}
          </label>
          <input
            id="observed-at"
            type="date"
            className="input-field"
            value={observedAt}
            onChange={(e) => setObservedAt(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
          />
        </div>

        {/* Tags Input */}
        <div>
          <label htmlFor="tag-input" className="label">
            {t('tagsLabel')}
          </label>
          <div className="flex gap-2">
            <input
              id="tag-input"
              type="text"
              className="input-field flex-1"
              placeholder={t('tagPlaceholder')}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              disabled={tags.length >= 5}
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="btn-secondary py-2 px-4 text-sm"
              disabled={tags.length >= 5 || !tagInput.trim()}
            >
              {tc('add')}
            </button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-xs font-medium bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="text-slate-400 hover:text-slate-600"
                    aria-label={t('removeTag', { tag })}
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

          {/* Submit */}
          <button
            type="submit"
            className="btn-primary w-full"
            disabled={
              !selectedChildId ||
              !selectedDimension ||
              !text.trim() ||
              !sentiment ||
              isSubmitting
            }
          >
            {isSubmitting ? t('saving') : t('saveObservation')}
          </button>
        </form>
      )}
    </div>
  );
}
