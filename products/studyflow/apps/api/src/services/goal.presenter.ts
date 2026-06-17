import { Goal, ProgressEntry } from '@prisma/client';
import {
  computeMetrics,
  GoalLike,
  EntryLike,
  MetricType,
  Cadence,
  Status,
} from './metrics.service';

/** A goal with its derived metrics, ready for API responses. */
export interface GoalView {
  id: string;
  selectionId: string;
  title: string;
  metricType: MetricType;
  target: number;
  cadence: Cadence;
  dueDate: string;
  status: Status;
  completionPct: number;
  streak: number;
  atRisk: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProgressEntryView {
  id: string;
  goalId: string;
  entryDate: string;
  value: number;
  note: string | null;
  createdAt: Date;
}

function dateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function toGoalLike(goal: Goal): GoalLike {
  return {
    metricType: goal.metricType as MetricType,
    target: Number(goal.target),
    cadence: goal.cadence as Cadence,
    dueDate: goal.dueDate,
    status: goal.status as Status,
  };
}

export function toEntryLike(e: ProgressEntry): EntryLike {
  return { entryDate: e.entryDate, value: Number(e.value) };
}

export function toProgressEntryView(e: ProgressEntry): ProgressEntryView {
  return {
    id: e.id,
    goalId: e.goalId,
    entryDate: dateOnly(e.entryDate),
    value: Number(e.value),
    note: e.note,
    createdAt: e.createdAt,
  };
}

/**
 * Serializes a goal + its entries into a GoalView with freshly computed derived
 * metrics. `now` is injectable for deterministic tests.
 */
export function toGoalView(
  goal: Goal,
  entries: ProgressEntry[],
  now: Date = new Date()
): GoalView {
  const metrics = computeMetrics(
    toGoalLike(goal),
    entries.map(toEntryLike),
    now
  );
  return {
    id: goal.id,
    selectionId: goal.selectionId,
    title: goal.title,
    metricType: goal.metricType as MetricType,
    target: Number(goal.target),
    cadence: goal.cadence as Cadence,
    dueDate: dateOnly(goal.dueDate),
    status: metrics.status,
    completionPct: metrics.completionPct,
    streak: metrics.streak,
    atRisk: metrics.atRisk,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt,
  };
}
