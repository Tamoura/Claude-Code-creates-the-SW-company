import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { GoalStatus } from '@/lib/types';

// --- Spinner ---------------------------------------------------------------

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <span role="status" aria-live="polite" className="inline-flex items-center gap-2 text-sm text-slate-500">
      <span
        aria-hidden
        className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600"
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-16">
      <Spinner label={label} />
    </div>
  );
}

// --- Error / Empty ----------------------------------------------------------

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center"
    >
      <h2 className="text-base font-semibold text-red-800">{title}</h2>
      <p className="mt-1 text-sm text-red-700">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 inline-flex rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  message,
  action,
  icon = '✨',
}: {
  title: string;
  message: string;
  action?: ReactNode;
  icon?: string;
}) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 p-10 text-center">
      <div aria-hidden className="mx-auto mb-3 text-3xl">
        {icon}
      </div>
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">{message}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

// --- Card -------------------------------------------------------------------

export function Card({
  children,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'li';
}) {
  return <Tag className={cn('card', className)}>{children}</Tag>;
}

// --- Badge ------------------------------------------------------------------

const BADGE_TONES = {
  neutral: 'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200/70',
  brand: 'bg-sage-50 text-sage-700 ring-1 ring-inset ring-sage-100',
  success: 'bg-sage-100 text-sage-800 ring-1 ring-inset ring-sage-200/70',
  warning: 'bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200/70',
  danger: 'bg-red-100 text-red-700 ring-1 ring-inset ring-red-200/70',
} as const;

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: keyof typeof BADGE_TONES;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        BADGE_TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

const STATUS_TONE: Record<GoalStatus, keyof typeof BADGE_TONES> = {
  draft: 'neutral',
  active: 'brand',
  at_risk: 'warning',
  completed: 'success',
  abandoned: 'neutral',
};

const STATUS_LABEL: Record<GoalStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  at_risk: 'At risk',
  completed: 'Completed',
  abandoned: 'Abandoned',
};

export function StatusBadge({ status }: { status: GoalStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}

// --- Progress bar -----------------------------------------------------------

export function ProgressBar({
  value,
  label,
}: {
  value: number;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const tone =
    pct >= 100 ? 'bg-sage-600' : pct >= 50 ? 'bg-sage-500' : 'bg-amber-500';
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-medium text-slate-600">
        <span>{label || 'Completion'}</span>
        <span>{pct}%</span>
      </div>
      <div
        className="mt-1 h-2 w-full overflow-hidden rounded-full bg-sage-50"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || 'Completion'}
      >
        <div
          className={cn('h-full rounded-full transition-all', tone)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
