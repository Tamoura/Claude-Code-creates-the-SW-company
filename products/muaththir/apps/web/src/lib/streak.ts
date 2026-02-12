/**
 * Streak calculation utilities for Mu'aththir.
 *
 * Calculates observation streaks (consecutive days with at
 * least one observation) and returns motivational message keys.
 */

/**
 * Extract unique date strings (YYYY-MM-DD) from ISO timestamp strings.
 */
function uniqueDays(observedAtDates: string[]): Set<string> {
  return new Set(
    observedAtDates.map((d) => new Date(d).toISOString().slice(0, 10))
  );
}

/**
 * Calculate the current streak: consecutive days (from today backwards)
 * that have at least one observation. If today has no observations,
 * the streak can still start from yesterday.
 */
export function calculateCurrentStreak(observedAtDates: string[]): number {
  if (observedAtDates.length === 0) return 0;

  const days = uniqueDays(observedAtDates);
  const today = new Date();
  let streak = 0;

  for (let i = 0; i <= days.size + 1; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = checkDate.toISOString().slice(0, 10);

    if (days.has(dateStr)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  return streak;
}

/**
 * Calculate the best (longest) streak ever from a list of
 * observation timestamps.
 */
export function calculateBestStreak(observedAtDates: string[]): number {
  if (observedAtDates.length === 0) return 0;

  const days = Array.from(uniqueDays(observedAtDates)).sort();
  let best = 1;
  let current = 1;

  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1]);
    const curr = new Date(days[i]);
    const diffMs = curr.getTime() - prev.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      current++;
      if (current > best) best = current;
    } else {
      current = 1;
    }
  }

  return best;
}

/**
 * Return a translation key for a motivational message based on
 * the current streak length.
 */
export function getStreakMessage(streak: number): string {
  if (streak === 0) return 'streakStart';
  if (streak <= 2) return 'streakGoing';
  if (streak <= 6) return 'streakStrong';
  if (streak <= 13) return 'streakAmazing';
  return 'streakLegendary';
}
