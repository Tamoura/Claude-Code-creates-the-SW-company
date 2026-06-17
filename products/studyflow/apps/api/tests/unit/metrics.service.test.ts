import {
  computeCompletionPct,
  computeStreak,
  isAtRisk,
  computeMetrics,
  nextStatus,
  GoalLike,
  EntryLike,
} from '../../src/services/metrics.service';

function goal(over: Partial<GoalLike> = {}): GoalLike {
  return {
    metricType: 'numeric',
    target: 10,
    cadence: 'daily',
    dueDate: new Date('2026-12-31'),
    status: 'active',
    ...over,
  };
}

function entry(date: string, value = 1): EntryLike {
  return { entryDate: new Date(date), value };
}

describe('metrics service — completion % (FR-016, BR-003)', () => {
  it('numeric: sum of values / target * 100, rounded', () => {
    expect(computeCompletionPct(goal({ metricType: 'numeric', target: 10 }), [
      entry('2026-06-01', 3),
      entry('2026-06-02', 2),
    ])).toBe(50);
  });

  it('numeric: caps at 100 even when sum exceeds target', () => {
    expect(computeCompletionPct(goal({ metricType: 'numeric', target: 5 }), [
      entry('2026-06-01', 10),
    ])).toBe(100);
  });

  it('numeric: 0 with no entries', () => {
    expect(computeCompletionPct(goal({ metricType: 'numeric', target: 10 }), [])).toBe(0);
  });

  it('percentage: takes the latest entry value, capped at 100', () => {
    expect(computeCompletionPct(goal({ metricType: 'percentage', target: 100 }), [
      entry('2026-06-01', 20),
      entry('2026-06-03', 75),
      entry('2026-06-02', 40),
    ])).toBe(75);
  });

  it('percentage: caps a >100 latest value at 100', () => {
    expect(computeCompletionPct(goal({ metricType: 'percentage', target: 100 }), [
      entry('2026-06-03', 150),
    ])).toBe(100);
  });

  it('boolean: 100 if any entry value >= 1, else 0', () => {
    expect(computeCompletionPct(goal({ metricType: 'boolean', target: 1 }), [
      entry('2026-06-01', 1),
    ])).toBe(100);
    expect(computeCompletionPct(goal({ metricType: 'boolean', target: 1 }), [
      entry('2026-06-01', 0),
    ])).toBe(0);
    expect(computeCompletionPct(goal({ metricType: 'boolean', target: 1 }), [])).toBe(0);
  });

  it('numeric: target of 0 does not divide-by-zero (returns 0)', () => {
    expect(computeCompletionPct(goal({ metricType: 'numeric', target: 0 }), [
      entry('2026-06-01', 5),
    ])).toBe(0);
  });
});

describe('metrics service — streak (FR-017, C-9)', () => {
  const today = new Date('2026-06-10');

  it('daily: counts consecutive days ending today', () => {
    expect(computeStreak(goal({ cadence: 'daily' }), [
      entry('2026-06-10'),
      entry('2026-06-09'),
      entry('2026-06-08'),
    ], today)).toBe(3);
  });

  it('daily: counts from yesterday if no entry today (grace, current run intact)', () => {
    expect(computeStreak(goal({ cadence: 'daily' }), [
      entry('2026-06-09'),
      entry('2026-06-08'),
    ], today)).toBe(2);
  });

  it('daily: resets to 0 when the most recent period is missed (gap of 2+)', () => {
    expect(computeStreak(goal({ cadence: 'daily' }), [
      entry('2026-06-07'),
      entry('2026-06-06'),
    ], today)).toBe(0);
  });

  it('daily: multiple entries on the same day count once', () => {
    expect(computeStreak(goal({ cadence: 'daily' }), [
      entry('2026-06-10'),
      entry('2026-06-10'),
      entry('2026-06-09'),
    ], today)).toBe(2);
  });

  it('daily: no entries => 0', () => {
    expect(computeStreak(goal({ cadence: 'daily' }), [], today)).toBe(0);
  });

  it('weekly: counts consecutive ISO weeks with >= 1 entry', () => {
    // 2026-06-10 is a Wednesday. Prior weeks: 06-03, 05-27.
    expect(computeStreak(goal({ cadence: 'weekly' }), [
      entry('2026-06-10'),
      entry('2026-06-03'),
      entry('2026-05-27'),
    ], today)).toBe(3);
  });

  it('weekly: a skipped week resets the streak', () => {
    expect(computeStreak(goal({ cadence: 'weekly' }), [
      entry('2026-06-10'),
      entry('2026-05-27'), // skips week of 06-03
    ], today)).toBe(1);
  });
});

describe('metrics service — at-risk (FR-018, C-6)', () => {
  const today = new Date('2026-06-10');

  it('at-risk when due within 7 days AND completion < 50%', () => {
    expect(isAtRisk(new Date('2026-06-15'), 30, today)).toBe(true);
  });

  it('not at-risk when completion >= 50% even if due soon', () => {
    expect(isAtRisk(new Date('2026-06-15'), 60, today)).toBe(false);
  });

  it('not at-risk when due far in the future', () => {
    expect(isAtRisk(new Date('2026-08-01'), 10, today)).toBe(false);
  });

  it('boundary: exactly 7 days away and 49% is at-risk', () => {
    expect(isAtRisk(new Date('2026-06-17'), 49, today)).toBe(true);
  });

  it('boundary: exactly 50% is NOT at-risk', () => {
    expect(isAtRisk(new Date('2026-06-15'), 50, today)).toBe(false);
  });
});

describe('metrics service — nextStatus & computeMetrics', () => {
  const today = new Date('2026-06-10');

  it('abandoned goals are never changed', () => {
    expect(nextStatus('abandoned', 100, false)).toBe('abandoned');
  });

  it('100% completion => completed', () => {
    expect(nextStatus('active', 100, false)).toBe('completed');
  });

  it('at-risk flag => at_risk when not complete', () => {
    expect(nextStatus('active', 30, true)).toBe('at_risk');
  });

  it('otherwise active', () => {
    expect(nextStatus('at_risk', 30, false)).toBe('active');
  });

  it('computeMetrics returns completionPct, streak, atRisk, status together', () => {
    const result = computeMetrics(
      goal({ metricType: 'numeric', target: 10, dueDate: new Date('2026-06-15') }),
      [entry('2026-06-10', 3), entry('2026-06-09', 0)],
      today
    );
    expect(result.completionPct).toBe(30);
    expect(result.streak).toBe(2);
    expect(result.atRisk).toBe(true);
    expect(result.status).toBe('at_risk');
  });
});
