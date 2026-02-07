// Pulse mobile app theme constants

export const colors = {
  primary: '#3B82F6',
  primaryDark: '#2563EB',
  primaryLight: '#60A5FA',

  background: '#0F172A',
  surface: '#1E293B',
  surfaceLight: '#334155',
  card: '#1E293B',

  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',

  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  riskLow: '#22C55E',
  riskMedium: '#F59E0B',
  riskHigh: '#EF4444',

  eventPush: '#3B82F6',
  eventPrOpened: '#22C55E',
  eventPrMerged: '#A855F7',
  eventPrClosed: '#EF4444',
  eventDeployment: '#F59E0B',
  eventReview: '#06B6D4',
  eventComment: '#64748B',

  border: '#334155',
  inputBg: '#1E293B',
  inputBorder: '#475569',
  placeholder: '#64748B',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
  hero: 48,
} as const;

export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export function getRiskColor(
  score: number
): typeof colors.riskLow | typeof colors.riskMedium | typeof colors.riskHigh {
  if (score <= 40) return colors.riskLow;
  if (score <= 70) return colors.riskMedium;
  return colors.riskHigh;
}

export function getRiskLevel(score: number): 'low' | 'medium' | 'high' {
  if (score <= 40) return 'low';
  if (score <= 70) return 'medium';
  return 'high';
}
