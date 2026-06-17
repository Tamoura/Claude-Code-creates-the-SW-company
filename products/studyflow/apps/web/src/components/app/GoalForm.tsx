'use client';

import { useState, type FormEvent } from 'react';
import { api, ApiError, type GoalInput } from '@/lib/api';
import type { Goal, MetricType, Cadence } from '@/lib/types';
import { todayISO } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';

const METRIC_HINT: Record<MetricType, string> = {
  numeric: 'Target is a total to reach (e.g. 40 hours studied).',
  boolean: 'Done or not done — target is 1.',
  percentage: 'Track a percentage toward 100%.',
};

interface Props {
  selectionId: string;
  /** When editing, the existing goal. */
  goal?: Goal;
  onSaved: () => void;
  onCancel: () => void;
}

export function GoalForm({ selectionId, goal, onSaved, onCancel }: Props) {
  const editing = !!goal;
  const [title, setTitle] = useState(goal?.title ?? '');
  const [metricType, setMetricType] = useState<MetricType>(
    goal?.metricType ?? 'numeric'
  );
  const [target, setTarget] = useState(
    goal ? String(goal.target) : ''
  );
  const [cadence, setCadence] = useState<Cadence>(goal?.cadence ?? 'daily');
  const [dueDate, setDueDate] = useState(goal?.dueDate?.slice(0, 10) ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = 'Title is required';
    const t = Number(target);
    if (!target || Number.isNaN(t) || t <= 0)
      e.target = 'Target must be a positive number';
    if (!dueDate) {
      e.dueDate = 'Due date is required';
    } else if (dueDate <= todayISO()) {
      e.dueDate = 'Due date must be in the future';
    }
    return e;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    setSubmitting(true);
    try {
      if (editing && goal) {
        await api.goals.update(goal.id, {
          title: title.trim(),
          metricType,
          target: Number(target),
          cadence,
          dueDate,
        });
      } else {
        const input: GoalInput = {
          selectionId,
          title: title.trim(),
          metricType,
          target: Number(target),
          cadence,
          dueDate,
        };
        await api.goals.create(input);
      }
      onSaved();
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) {
        setErrors(err.fieldErrors);
      }
      setFormError(
        err instanceof ApiError ? err.message : 'Could not save goal.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="card space-y-4"
      aria-label={editing ? 'Edit goal' : 'Create a goal'}
    >
      <h2 className="text-base font-semibold text-slate-900">
        {editing ? 'Edit goal' : 'New goal'}
      </h2>

      {formError && (
        <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {formError}
        </div>
      )}

      <Input
        label="Goal title"
        placeholder="e.g. Study 40 hours this term"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        error={errors.title}
        required
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          label="Metric type"
          value={metricType}
          onChange={(e) => setMetricType(e.target.value as MetricType)}
        >
          <option value="numeric">Numeric (total)</option>
          <option value="boolean">Boolean (done / not done)</option>
          <option value="percentage">Percentage</option>
        </Select>
        <Input
          label="Target"
          type="number"
          min={0}
          step="any"
          placeholder="40"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          error={errors.target}
          hint={METRIC_HINT[metricType]}
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          label="Cadence"
          value={cadence}
          onChange={(e) => setCadence(e.target.value as Cadence)}
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
        </Select>
        <Input
          label="Due date"
          type="date"
          min={todayISO()}
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          error={errors.dueDate}
          required
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" loading={submitting}>
          {editing ? 'Save changes' : 'Create goal'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
