import { differenceInYears } from 'date-fns';
import { AgeBandType } from '../types';

export function getAgeBand(
  dateOfBirth: Date,
  referenceDate: Date = new Date()
): AgeBandType | 'out_of_range' {
  const ageInYears = differenceInYears(referenceDate, dateOfBirth);
  if (ageInYears >= 3 && ageInYears <= 5) return 'early_years';
  if (ageInYears >= 6 && ageInYears <= 9) return 'primary';
  if (ageInYears >= 10 && ageInYears <= 12) return 'upper_primary';
  if (ageInYears >= 13 && ageInYears <= 16) return 'secondary';
  return 'out_of_range';
}
