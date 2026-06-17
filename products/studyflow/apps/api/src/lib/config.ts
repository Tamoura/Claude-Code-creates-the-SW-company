/**
 * Domain constants. The single active term (C-5) is fixed for the MVP and must
 * match the seed catalog term so new students see the seeded subjects.
 */
export const ACTIVE_TERM = process.env.STUDYFLOW_ACTIVE_TERM || '2026-S1';

/** At-risk window (C-6): due within 7 days AND completion < 50%. */
export const AT_RISK_DUE_DAYS = 7;
export const AT_RISK_COMPLETION_PCT = 50;

/** Reminder window: goals due within this many days surface a reminder (C-4). */
export const REMINDER_DUE_DAYS = 7;
