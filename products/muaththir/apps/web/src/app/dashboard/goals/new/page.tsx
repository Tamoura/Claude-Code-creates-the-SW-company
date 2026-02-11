'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DIMENSIONS } from '../../../../lib/dimensions';
import { apiClient } from '../../../../lib/api-client';

export default function NewGoalPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const childId = searchParams.get('childId');

  const [title, setTitle] = useState('');
  const [dimension, setDimension] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        <p className="text-sm text-slate-500">No child selected. Go back to goals.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Create Goal</h1>
        <p className="text-sm text-slate-500 mt-1">Set a development goal for your child.</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5">
        {error && (
          <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="goal-title" className="label">Goal Title</label>
          <input
            id="goal-title"
            type="text"
            required
            className="input-field"
            placeholder="e.g., Read 20 books this year"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
          />
        </div>

        <fieldset>
          <legend className="label mb-3">Dimension</legend>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {DIMENSIONS.map((dim) => (
              <button
                key={dim.slug}
                type="button"
                onClick={() => setDimension(dim.slug)}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  dimension === dim.slug ? 'shadow-sm' : 'border-slate-200 hover:border-slate-300'
                }`}
                style={dimension === dim.slug ? { borderColor: dim.colour, backgroundColor: `${dim.colour}08` } : {}}
                aria-pressed={dimension === dim.slug}
              >
                <span className="block h-2 w-2 rounded-full mb-2" style={{ backgroundColor: dim.colour }} aria-hidden="true" />
                <span className="text-sm font-medium text-slate-900">{dim.name}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="goal-desc" className="label">Description (optional)</label>
          <textarea
            id="goal-desc"
            rows={3}
            className="input-field resize-none"
            placeholder="Add details about this goal..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
          />
        </div>

        <div>
          <label htmlFor="target-date" className="label">Target Date (optional)</label>
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
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary flex-1"
            disabled={!title.trim() || !dimension || isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Goal'}
          </button>
        </div>
      </form>
    </div>
  );
}
