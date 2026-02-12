'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { DIMENSIONS, getDimensionBySlug } from '../../../../lib/dimensions';
import { apiClient, type GoalTemplate, type Child } from '../../../../lib/api-client';

export default function NewGoalPage() {
  const t = useTranslations('newGoal');
  const tc = useTranslations('common');
  const td = useTranslations('dimensions');
  const router = useRouter();
  const searchParams = useSearchParams();
  const childId = searchParams.get('childId');

  // Form state
  const [title, setTitle] = useState('');
  const [dimension, setDimension] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Template state
  const [templates, setTemplates] = useState<GoalTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateDimFilter, setTemplateDimFilter] = useState<string>('');
  const [child, setChild] = useState<Child | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Load child data to get ageBand
  useEffect(() => {
    if (!childId) return;
    let cancelled = false;
    const loadChild = async () => {
      try {
        const data = await apiClient.getChild(childId);
        if (!cancelled) setChild(data);
      } catch {
        // Child load failed silently -- templates will still work without ageBand
      }
    };
    loadChild();
    return () => { cancelled = true; };
  }, [childId]);

  // Load templates when child or dimension filter changes
  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const params: { dimension?: string; ageBand?: string } = {};
      if (templateDimFilter) params.dimension = templateDimFilter;
      if (child?.ageBand) params.ageBand = child.ageBand;
      const data = await apiClient.getGoalTemplates(params);
      setTemplates(data);
    } catch {
      // Template load failure is non-critical; user can still create custom goals
      setTemplates([]);
    } finally {
      setTemplatesLoading(false);
    }
  }, [templateDimFilter, child?.ageBand]);

  useEffect(() => {
    if (!childId) return;
    loadTemplates();
  }, [childId, loadTemplates]);

  const handleUseTemplate = (template: GoalTemplate) => {
    setTitle(template.title);
    setDescription(template.description);
    setDimension(template.dimension);
    setSelectedTemplateId(template.id);

    // Scroll to the form
    document.getElementById('custom-goal-form')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!childId) return;

    setIsSubmitting(true);
    setError('');

    try {
      await apiClient.createGoal(childId, {
        title,
        dimension,
        description: description || undefined,
        targetDate: targetDate || undefined,
      });
      router.push('/dashboard/goals');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create goal');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!childId) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-slate-500">{t('noChildSelected')}</p>
      </div>
    );
  }

  // Group templates by dimension
  const templatesByDimension: Record<string, GoalTemplate[]> = {};
  templates.forEach((t) => {
    if (!templatesByDimension[t.dimension]) {
      templatesByDimension[t.dimension] = [];
    }
    templatesByDimension[t.dimension].push(t);
  });

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
        <p className="text-sm text-slate-500 mt-1">
          {t('subtitle')}
        </p>
      </div>

      {/* ==================== Template Section ==================== */}
      <section aria-labelledby="templates-heading">
        <div className="flex items-center justify-between mb-4">
          <h2 id="templates-heading" className="text-lg font-semibold text-slate-900">
            {t('chooseFromTemplates')}
          </h2>
          {child?.ageBand && (
            <span className="text-xs text-slate-400">
              {t('showingForAge', { ageBand: child.ageBand.replace(/_/g, ' ') })}
            </span>
          )}
        </div>

        {/* Dimension filter tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setTemplateDimFilter('')}
            className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
              templateDimFilter === ''
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t('allTemplates')}
          </button>
          {DIMENSIONS.map((dim) => (
            <button
              key={dim.slug}
              onClick={() => setTemplateDimFilter(dim.slug)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                templateDimFilter === dim.slug
                  ? 'text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              style={
                templateDimFilter === dim.slug
                  ? { backgroundColor: dim.colour }
                  : {}
              }
            >
              {td(dim.slug as any)}
            </button>
          ))}
        </div>

        {/* Templates grid */}
        {templatesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-28 bg-slate-100 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-sm text-slate-500">
              {templateDimFilter ? t('noTemplatesForDimension') : t('noTemplates')} {t('createCustomBelow')}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(templatesByDimension).map(([dimSlug, dimTemplates]) => {
              const dim = getDimensionBySlug(dimSlug);
              return (
                <div key={dimSlug}>
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: dim?.colour || '#94a3b8' }}
                      aria-hidden="true"
                    />
                    <h3 className="text-sm font-semibold text-slate-700">
                      {td(dimSlug as any)}
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {dimTemplates.map((template) => (
                      <div
                        key={template.id}
                        className={`rounded-2xl p-4 border-2 transition-all cursor-pointer hover:shadow-md ${
                          selectedTemplateId === template.id
                            ? 'shadow-sm'
                            : 'border-slate-100 bg-white'
                        }`}
                        style={
                          selectedTemplateId === template.id
                            ? {
                                borderColor: dim?.colour || '#10b981',
                                backgroundColor: `${dim?.colour || '#10b981'}08`,
                              }
                            : {}
                        }
                        role="button"
                        tabIndex={0}
                        onClick={() => handleUseTemplate(template)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleUseTemplate(template);
                          }
                        }}
                      >
                        <h4 className="text-sm font-semibold text-slate-900 mb-1">
                          {template.title}
                        </h4>
                        <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                          {template.description}
                        </p>
                        <span
                          className="inline-flex items-center text-xs font-medium transition-colors"
                          style={{ color: dim?.colour || '#10b981' }}
                        >
                          {selectedTemplateId === template.id
                            ? t('selected')
                            : t('useThisGoal')}
                          <svg
                            className="h-3 w-3 ml-1"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ==================== Divider ==================== */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-slate-50 px-4 text-sm text-slate-400">
            {t('orCreateCustom')}
          </span>
        </div>
      </div>

      {/* ==================== Custom Goal Form ==================== */}
      <form
        id="custom-goal-form"
        onSubmit={handleSubmit}
        className="card space-y-5"
      >
        {error && (
          <div
            className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
            role="alert"
          >
            {error}
          </div>
        )}

        <div>
          <label htmlFor="goal-title" className="label">
            {t('goalTitle')}
          </label>
          <input
            id="goal-title"
            type="text"
            required
            className="input-field"
            placeholder={t('goalTitlePlaceholder')}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setSelectedTemplateId(null);
            }}
            maxLength={200}
          />
        </div>

        <fieldset>
          <legend className="label mb-3">{t('dimension')}</legend>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {DIMENSIONS.map((dim) => (
              <button
                key={dim.slug}
                type="button"
                onClick={() => setDimension(dim.slug)}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  dimension === dim.slug
                    ? 'shadow-sm'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                style={
                  dimension === dim.slug
                    ? {
                        borderColor: dim.colour,
                        backgroundColor: `${dim.colour}08`,
                      }
                    : {}
                }
                aria-pressed={dimension === dim.slug}
              >
                <span
                  className="block h-2 w-2 rounded-full mb-2"
                  style={{ backgroundColor: dim.colour }}
                  aria-hidden="true"
                />
                <span className="text-sm font-medium text-slate-900">
                  {td(dim.slug as any)}
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="goal-desc" className="label">
            {t('descriptionOptional')}
          </label>
          <textarea
            id="goal-desc"
            rows={3}
            className="input-field resize-none"
            placeholder={t('descriptionPlaceholder')}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setSelectedTemplateId(null);
            }}
            maxLength={500}
          />
        </div>

        <div>
          <label htmlFor="target-date" className="label">
            {t('targetDateOptional')}
          </label>
          <input
            id="target-date"
            type="date"
            className="input-field"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-secondary flex-1"
          >
            {tc('cancel')}
          </button>
          <button
            type="submit"
            className="btn-primary flex-1"
            disabled={!title.trim() || !dimension || isSubmitting}
          >
            {isSubmitting ? t('creating') : t('createGoal')}
          </button>
        </div>
      </form>
    </div>
  );
}
