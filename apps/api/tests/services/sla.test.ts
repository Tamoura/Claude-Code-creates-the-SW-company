import { describe, it, expect } from 'vitest';
import { Priority } from '@prisma/client';
import { calculateSLADeadlines } from '../../src/services/sla.service.js';
import { addMinutes } from 'date-fns';

describe('SLA Service', () => {
  const slaConfig = {
    p1ResponseMinutes: 15,
    p1ResolutionMinutes: 60,
    p2ResponseMinutes: 30,
    p2ResolutionMinutes: 240,
    p3ResponseMinutes: 120,
    p3ResolutionMinutes: 480,
    p4ResponseMinutes: 480,
    p4ResolutionMinutes: 1440,
  };

  it('should calculate P1 SLA deadlines correctly', () => {
    const createdAt = new Date('2024-01-15T10:00:00Z');
    const deadlines = calculateSLADeadlines(Priority.P1, createdAt, slaConfig);

    expect(deadlines.responseSlaDue).toEqual(addMinutes(createdAt, 15));
    expect(deadlines.resolutionSlaDue).toEqual(addMinutes(createdAt, 60));
  });

  it('should calculate P2 SLA deadlines correctly', () => {
    const createdAt = new Date('2024-01-15T10:00:00Z');
    const deadlines = calculateSLADeadlines(Priority.P2, createdAt, slaConfig);

    expect(deadlines.responseSlaDue).toEqual(addMinutes(createdAt, 30));
    expect(deadlines.resolutionSlaDue).toEqual(addMinutes(createdAt, 240));
  });

  it('should calculate P3 SLA deadlines correctly', () => {
    const createdAt = new Date('2024-01-15T10:00:00Z');
    const deadlines = calculateSLADeadlines(Priority.P3, createdAt, slaConfig);

    expect(deadlines.responseSlaDue).toEqual(addMinutes(createdAt, 120));
    expect(deadlines.resolutionSlaDue).toEqual(addMinutes(createdAt, 480));
  });

  it('should calculate P4 SLA deadlines correctly', () => {
    const createdAt = new Date('2024-01-15T10:00:00Z');
    const deadlines = calculateSLADeadlines(Priority.P4, createdAt, slaConfig);

    expect(deadlines.responseSlaDue).toEqual(addMinutes(createdAt, 480));
    expect(deadlines.resolutionSlaDue).toEqual(addMinutes(createdAt, 1440));
  });
});
