import Link from 'next/link';
import type { Reminder } from '@/lib/types';
import { Badge } from '@/components/ui/feedback';

const KIND_LABEL: Record<Reminder['kind'], string> = {
  due_soon: 'Due soon',
  streak_at_risk: 'Streak at risk',
  at_risk: 'At risk',
};

export function ReminderList({ reminders }: { reminders: Reminder[] }) {
  if (reminders.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        You&apos;re all caught up — no reminders right now.
      </p>
    );
  }
  return (
    <ul aria-live="polite" className="space-y-2">
      {reminders.map((r) => (
        <li
          key={`${r.goalId}-${r.kind}`}
          className="flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge tone="warning">{KIND_LABEL[r.kind]}</Badge>
              <Link
                href={`/goals/${r.goalId}`}
                className="truncate text-sm font-semibold text-slate-900 hover:underline"
              >
                {r.title}
              </Link>
            </div>
            <p className="mt-0.5 text-xs text-slate-600">{r.message}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
