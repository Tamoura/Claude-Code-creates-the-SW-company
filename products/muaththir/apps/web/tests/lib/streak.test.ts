import { calculateCurrentStreak, calculateBestStreak, getStreakMessage } from '../../src/lib/streak';

describe('calculateCurrentStreak', () => {
  it('returns 0 for empty observations', () => {
    expect(calculateCurrentStreak([])).toBe(0);
  });

  it('returns 1 when only today has observations', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(calculateCurrentStreak([`${today}T10:00:00Z`])).toBe(1);
  });

  it('returns consecutive days count from today backwards', () => {
    const dates: string[] = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(`${d.toISOString().slice(0, 10)}T10:00:00Z`);
    }
    expect(calculateCurrentStreak(dates)).toBe(5);
  });

  it('breaks streak when a day is missing', () => {
    const today = new Date();
    const dates: string[] = [];
    // Today and yesterday
    dates.push(`${today.toISOString().slice(0, 10)}T10:00:00Z`);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    dates.push(`${yesterday.toISOString().slice(0, 10)}T10:00:00Z`);
    // Skip day before yesterday, add 3 days ago
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    dates.push(`${threeDaysAgo.toISOString().slice(0, 10)}T10:00:00Z`);
    expect(calculateCurrentStreak(dates)).toBe(2);
  });

  it('allows streak from yesterday if today has no observations yet', () => {
    const dates: string[] = [];
    for (let i = 1; i <= 3; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(`${d.toISOString().slice(0, 10)}T10:00:00Z`);
    }
    expect(calculateCurrentStreak(dates)).toBe(3);
  });

  it('deduplicates multiple observations on the same day', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(
      calculateCurrentStreak([
        `${today}T08:00:00Z`,
        `${today}T12:00:00Z`,
        `${today}T18:00:00Z`,
      ])
    ).toBe(1);
  });
});

describe('calculateBestStreak', () => {
  it('returns 0 for empty observations', () => {
    expect(calculateBestStreak([])).toBe(0);
  });

  it('returns 1 for a single observation', () => {
    expect(calculateBestStreak(['2024-06-01T10:00:00Z'])).toBe(1);
  });

  it('returns the longest consecutive run', () => {
    // Streak of 3 days, gap, streak of 5 days
    const dates = [
      '2024-06-01T10:00:00Z',
      '2024-06-02T10:00:00Z',
      '2024-06-03T10:00:00Z',
      // gap on 06-04
      '2024-06-05T10:00:00Z',
      '2024-06-06T10:00:00Z',
      '2024-06-07T10:00:00Z',
      '2024-06-08T10:00:00Z',
      '2024-06-09T10:00:00Z',
    ];
    expect(calculateBestStreak(dates)).toBe(5);
  });

  it('handles duplicate dates correctly', () => {
    const dates = [
      '2024-06-01T08:00:00Z',
      '2024-06-01T18:00:00Z',
      '2024-06-02T10:00:00Z',
      '2024-06-03T10:00:00Z',
    ];
    expect(calculateBestStreak(dates)).toBe(3);
  });
});

describe('getStreakMessage', () => {
  it('returns starter message for streak of 0', () => {
    const msg = getStreakMessage(0);
    expect(msg).toBe('streakStart');
  });

  it('returns fire message for short streaks (1-2)', () => {
    expect(getStreakMessage(1)).toBe('streakGoing');
    expect(getStreakMessage(2)).toBe('streakGoing');
  });

  it('returns strong message for medium streaks (3-6)', () => {
    expect(getStreakMessage(3)).toBe('streakStrong');
    expect(getStreakMessage(6)).toBe('streakStrong');
  });

  it('returns amazing message for long streaks (7-13)', () => {
    expect(getStreakMessage(7)).toBe('streakAmazing');
    expect(getStreakMessage(13)).toBe('streakAmazing');
  });

  it('returns legendary message for 14+ day streaks', () => {
    expect(getStreakMessage(14)).toBe('streakLegendary');
    expect(getStreakMessage(30)).toBe('streakLegendary');
  });
});
