/**
 * Pure derived-metrics service (FR-016/017/018, BR-003, C-6, C-9, NFR-002).
 *
 * No I/O. Inputs are plain numbers/dates (callers convert Prisma Decimals via
 * Number()). Deterministic and exhaustively unit-tested so completion %,
 * streaks, and at-risk are provably correct.
 */
import {
  AT_RISK_DUE_DAYS,
  AT_RISK_COMPLETION_PCT,
} from '../lib/config';

export type MetricType = 'numeric' | 'boolean' | 'percentage';
export type Cadence = 'daily' | 'weekly';
export type Status = 'draft' | 'active' | 'at_risk' | 'completed' | 'abandoned';

export interface GoalLike {
  metricType: MetricType;
  target: number;
  cadence: Cadence;
  dueDate: Date;
  status: Status;
}

export interface EntryLike {
  entryDate: Date;
  value: number;
}

export interface MetricsResult {
  completionPct: number;
  streak: number;
  atRisk: boolean;
  status: Status;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Truncates a date to its UTC calendar day (midnight). */
function toUtcDay(d: Date): number {
  return Math.floor(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / MS_PER_DAY
  );
}

/**
 * Completion % capped at 100 (BR-003):
 * - numeric: sum(values) / target * 100, rounded
 * - percentage: latest entry value (by date), capped
 * - boolean: 100 if any value >= 1, else 0
 */
export function computeCompletionPct(
  goal: GoalLike,
  entries: EntryLike[]
): number {
  if (goal.metricType === 'boolean') {
    return entries.some((e) => e.value >= 1) ? 100 : 0;
  }

  if (goal.metricType === 'percentage') {
    if (entries.length === 0) return 0;
    const latest = [...entries].sort(
      (a, b) => b.entryDate.getTime() - a.entryDate.getTime()
    )[0];
    return Math.min(100, Math.max(0, Math.round(latest.value)));
  }

  // numeric
  if (goal.target <= 0) return 0;
  const sum = entries.reduce((acc, e) => acc + e.value, 0);
  return Math.min(100, Math.max(0, Math.round((sum / goal.target) * 100)));
}

/** ISO-week index: number of whole weeks since the Unix epoch Monday. */
function toWeekIndex(dayIndex: number): number {
  // Unix epoch (day 0) was a Thursday; shift so weeks start Monday.
  return Math.floor((dayIndex + 3) / 7);
}

/**
 * Streak (C-9): count of consecutive most-recent cadence periods that each have
 * ≥1 entry, ending at today's period or the immediately prior one (a grace
 * period so a not-yet-logged current period doesn't zero an active streak).
 * Resets on any earlier missed period.
 */
export function computeStreak(
  goal: GoalLike,
  entries: EntryLike[],
  today: Date = new Date()
): number {
  if (entries.length === 0) return 0;

  const periodOf = (d: Date): number =>
    goal.cadence === 'weekly' ? toWeekIndex(toUtcDay(d)) : toUtcDay(d);

  const periods = new Set(entries.map((e) => periodOf(e.entryDate)));
  const current = periodOf(today);

  // Anchor: the current period if it has an entry, else the previous period if
  // it does; otherwise the streak is broken.
  let anchor: number;
  if (periods.has(current)) {
    anchor = current;
  } else if (periods.has(current - 1)) {
    anchor = current - 1;
  } else {
    return 0;
  }

  let streak = 0;
  let p = anchor;
  while (periods.has(p)) {
    streak += 1;
    p -= 1;
  }
  return streak;
}

/** At-risk (C-6): due within N days AND completion < threshold. */
export function isAtRisk(
  dueDate: Date,
  completionPct: number,
  today: Date = new Date()
): boolean {
  const daysToDue = toUtcDay(dueDate) - toUtcDay(today);
  return (
    daysToDue >= 0 &&
    daysToDue <= AT_RISK_DUE_DAYS &&
    completionPct < AT_RISK_COMPLETION_PCT
  );
}

/**
 * Stored lifecycle status (PRD §7). Terminal `abandoned` is never auto-changed.
 * 100% ⇒ completed; else at-risk flag ⇒ at_risk; else active.
 */
export function nextStatus(
  current: Status,
  completionPct: number,
  atRisk: boolean
): Status {
  if (current === 'abandoned') return 'abandoned';
  if (completionPct >= 100) return 'completed';
  if (atRisk) return 'at_risk';
  return 'active';
}

/** Computes all derived metrics + the next stored status for a goal. */
export function computeMetrics(
  goal: GoalLike,
  entries: EntryLike[],
  today: Date = new Date()
): MetricsResult {
  const completionPct = computeCompletionPct(goal, entries);
  const streak = computeStreak(goal, entries, today);
  const atRisk = isAtRisk(goal.dueDate, completionPct, today);
  const status = nextStatus(goal.status, completionPct, atRisk);
  return { completionPct, streak, atRisk, status };
}
