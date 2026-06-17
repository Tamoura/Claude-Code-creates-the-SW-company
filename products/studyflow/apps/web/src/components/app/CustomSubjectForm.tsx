'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';

/** Add a subject not in the catalog (US-05). Auto-creates a selection server-side. */
export function CustomSubjectForm({ onAdded }: { onAdded?: () => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [credits, setCredits] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setName('');
    setCode('');
    setCredits('');
    setDescription('');
    setNameError(undefined);
    setFormError(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!name.trim()) {
      setNameError('Subject name is required');
      return;
    }
    setNameError(undefined);
    setSubmitting(true);
    try {
      await api.subjects.create({
        name: name.trim(),
        code: code.trim() || undefined,
        credits: credits ? Number(credits) : undefined,
        description: description.trim() || undefined,
      });
      reset();
      setOpen(false);
      onAdded?.();
      router.refresh();
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : 'Could not add subject.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        + Add custom subject
      </Button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="card space-y-4"
      aria-label="Add a custom subject"
    >
      <h2 className="text-base font-semibold text-slate-900">
        Add a custom subject
      </h2>

      {formError && (
        <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {formError}
        </div>
      )}

      <Input
        label="Subject name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={nameError}
        required
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Code (optional)"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <Input
          label="Credits (optional)"
          type="number"
          min={0}
          value={credits}
          onChange={(e) => setCredits(e.target.value)}
        />
      </div>
      <Textarea
        label="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <div className="flex gap-2">
        <Button type="submit" loading={submitting}>
          Add subject
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            reset();
            setOpen(false);
          }}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
