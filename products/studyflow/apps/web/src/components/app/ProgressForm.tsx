'use client';

import { useState, type FormEvent } from 'react';
import { api, ApiError } from '@/lib/api';
import type { MetricType } from '@/lib/types';
import { todayISO } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';

/** Log a progress entry against a goal (US-07). */
export function ProgressForm({
  goalId,
  metricType,
  onLogged,
}: {
  goalId: string;
  metricType: MetricType;
  onLogged: () => void;
}) {
  const [value, setValue] = useState(metricType === 'boolean' ? '1' : '');
  const [entryDate, setEntryDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const v: Record<string, string> = {};
    const num = Number(value);
    if (value === '' || Number.isNaN(num)) v.value = 'Enter a numeric value';
    if (!entryDate) v.entryDate = 'Date is required';
    else if (entryDate > todayISO()) v.entryDate = 'Date cannot be in the future';
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    setSubmitting(true);
    try {
      await api.progress.add(goalId, {
        value: num,
        entryDate,
        note: note.trim() || undefined,
      });
      setValue(metricType === 'boolean' ? '1' : '');
      setNote('');
      setEntryDate(todayISO());
      onLogged();
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) setErrors(err.fieldErrors);
      setFormError(
        err instanceof ApiError ? err.message : 'Could not log progress.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="space-y-4"
      aria-label="Log progress"
    >
      {formError && (
        <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {formError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {metricType === 'boolean' ? (
          <Select
            label="Completed?"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            error={errors.value}
          >
            <option value="1">Yes — done</option>
            <option value="0">No</option>
          </Select>
        ) : (
          <Input
            label={metricType === 'percentage' ? 'Percentage (0–100)' : 'Value'}
            type="number"
            step="any"
            min={0}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            error={errors.value}
            required
          />
        )}
        <Input
          label="Date"
          type="date"
          max={todayISO()}
          value={entryDate}
          onChange={(e) => setEntryDate(e.target.value)}
          error={errors.entryDate}
          required
        />
      </div>

      <Textarea
        label="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={2000}
      />

      <Button type="submit" loading={submitting}>
        Log progress
      </Button>
    </form>
  );
}
