import { DashboardRepository } from '../repositories/dashboard.repository';
import { ReminderService, Reminder, buildReminders } from './reminder.service';
import { toGoalView, GoalView } from './goal.presenter';
import { toSubjectView, SubjectView } from './subject.service';
import { ACTIVE_TERM } from '../lib/config';

export interface DashboardSelection {
  id: string;
  subject: SubjectView;
  goalCount: number;
  avgCompletionPct: number;
}

export interface DashboardView {
  activeTerm: string;
  selections: DashboardSelection[];
  activeGoals: Pick<
    GoalView,
    'id' | 'title' | 'completionPct' | 'streak' | 'status' | 'dueDate'
  >[];
  aggregate: {
    totalGoals: number;
    completedGoals: number;
    overallCompletionPct: number;
  };
  reminders: Reminder[];
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

/**
 * Unified dashboard aggregation (US-10, FR-021). Computes per-selection goal
 * counts + average completion, the active-goal list, overall aggregates, and
 * mirrors the reminder feed (US-10 AC-4). Empty for new students (NFR-009).
 */
export class DashboardService {
  constructor(
    private readonly repo: DashboardRepository,
    private readonly reminders: ReminderService
  ) {}

  async get(studentId: string, now: Date = new Date()): Promise<DashboardView> {
    const selections = await this.repo.selectionsWithGoals(studentId, ACTIVE_TERM);

    const allGoalViews: GoalView[] = [];
    const dashSelections: DashboardSelection[] = selections.map((s) => {
      const goalViews = s.goals.map((g) => toGoalView(g, g.progressEntries, now));
      allGoalViews.push(...goalViews);
      return {
        id: s.id,
        subject: toSubjectView(s.subject),
        goalCount: goalViews.length,
        avgCompletionPct: avg(goalViews.map((g) => g.completionPct)),
      };
    });

    const completedGoals = allGoalViews.filter((g) => g.status === 'completed').length;
    const activeGoals = allGoalViews
      .filter((g) => g.status !== 'abandoned')
      .map((g) => ({
        id: g.id,
        title: g.title,
        completionPct: g.completionPct,
        streak: g.streak,
        status: g.status,
        dueDate: g.dueDate,
      }));

    return {
      activeTerm: ACTIVE_TERM,
      selections: dashSelections,
      activeGoals,
      aggregate: {
        totalGoals: allGoalViews.length,
        completedGoals,
        overallCompletionPct: avg(allGoalViews.map((g) => g.completionPct)),
      },
      // Reuse the reminder rules against already-loaded goal views (no re-query).
      reminders: buildReminders(allGoalViews, now),
    };
  }
}
