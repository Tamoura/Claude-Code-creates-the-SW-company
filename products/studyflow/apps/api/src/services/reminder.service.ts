import { DashboardRepository } from '../repositories/dashboard.repository';
import { toGoalView, GoalView } from './goal.presenter';
import { ACTIVE_TERM, REMINDER_DUE_DAYS } from '../lib/config';

export interface Reminder {
  goalId: string;
  title: string;
  kind: 'due_soon' | 'at_risk';
  dueDate: string;
  completionPct: number;
  message: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysUntil(dueIso: string, now: Date): number {
  const due = new Date(`${dueIso}T00:00:00.000Z`).getTime();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.floor((due - today) / MS_PER_DAY);
}

/**
 * Builds the reminder list from goal views (compute-on-read, FR-019/020, C-4).
 * Excludes completed/abandoned goals (US-09 AC-4). A reminder auto-clears once
 * progress pushes the goal out of the at-risk/due-soon window or to completion.
 */
export function buildReminders(goals: GoalView[], now: Date = new Date()): Reminder[] {
  const reminders: Reminder[] = [];
  for (const g of goals) {
    if (g.status === 'completed' || g.status === 'abandoned') continue;
    const days = daysUntil(g.dueDate, now);
    if (days < 0) continue;

    if (g.atRisk) {
      reminders.push({
        goalId: g.id,
        title: g.title,
        kind: 'at_risk',
        dueDate: g.dueDate,
        completionPct: g.completionPct,
        message: `"${g.title}" is at risk — due in ${days} day(s) and ${g.completionPct}% complete.`,
      });
    } else if (days <= REMINDER_DUE_DAYS) {
      reminders.push({
        goalId: g.id,
        title: g.title,
        kind: 'due_soon',
        dueDate: g.dueDate,
        completionPct: g.completionPct,
        message: `"${g.title}" is due in ${days} day(s).`,
      });
    }
  }
  return reminders;
}

export class ReminderService {
  constructor(private readonly repo: DashboardRepository) {}

  async list(studentId: string, now: Date = new Date()): Promise<Reminder[]> {
    const selections = await this.repo.selectionsWithGoals(studentId, ACTIVE_TERM);
    const goalViews: GoalView[] = selections.flatMap((s) =>
      s.goals.map((g) => toGoalView(g, g.progressEntries, now))
    );
    return buildReminders(goalViews, now);
  }
}
