'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/Button';

/**
 * Adds a subject to the student's plan (a Selection). Handles the advisory
 * prerequisite warning (FR-025/US-13): if the API returns unmet prereqs, we
 * prompt the student to acknowledge, then re-submit with `prereqWarningAck`.
 */
export function AddToPlanButton({
  subjectId,
  onAdded,
  size = 'sm',
}: {
  subjectId: string;
  onAdded?: () => void;
  size?: 'sm' | 'md';
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'ok' | 'error'>('ok');

  async function add(ack?: boolean) {
    setLoading(true);
    setMessage(null);
    try {
      const res = await api.selections.add(subjectId, ack);
      if (res.prerequisiteWarning?.unmet?.length && !ack) {
        const unmet = res.prerequisiteWarning.unmet.join(', ');
        const confirmed = window.confirm(
          `This subject has unmet prerequisites: ${unmet}.\n\nThis is advisory only — add it anyway?`
        );
        if (confirmed) {
          await add(true);
          return;
        }
        setMessage('Not added.');
        setTone('ok');
        return;
      }
      setMessage('Added to your plan ✓');
      setTone('ok');
      onAdded?.();
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.isConflict) {
        setMessage('Already in your plan.');
        setTone('ok');
      } else {
        setMessage(
          err instanceof ApiError ? err.message : 'Could not add subject.'
        );
        setTone('error');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button size={size} loading={loading} onClick={() => add()}>
        Add to my plan
      </Button>
      {message && (
        <span
          role="status"
          className={tone === 'error' ? 'text-xs text-red-600' : 'text-xs text-emerald-600'}
        >
          {message}
        </span>
      )}
    </div>
  );
}
