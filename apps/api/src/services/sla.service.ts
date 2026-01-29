import { Priority } from '@prisma/client';
import { addMinutes } from 'date-fns';

export interface SLAConfig {
  p1ResponseMinutes: number;
  p1ResolutionMinutes: number;
  p2ResponseMinutes: number;
  p2ResolutionMinutes: number;
  p3ResponseMinutes: number;
  p3ResolutionMinutes: number;
  p4ResponseMinutes: number;
  p4ResolutionMinutes: number;
}

export interface SLADeadlines {
  responseSlaDue: Date;
  resolutionSlaDue: Date;
}

export function calculateSLADeadlines(
  priority: Priority,
  createdAt: Date,
  config: SLAConfig
): SLADeadlines {
  let responseMinutes: number;
  let resolutionMinutes: number;

  switch (priority) {
    case Priority.P1:
      responseMinutes = config.p1ResponseMinutes;
      resolutionMinutes = config.p1ResolutionMinutes;
      break;
    case Priority.P2:
      responseMinutes = config.p2ResponseMinutes;
      resolutionMinutes = config.p2ResolutionMinutes;
      break;
    case Priority.P3:
      responseMinutes = config.p3ResponseMinutes;
      resolutionMinutes = config.p3ResolutionMinutes;
      break;
    case Priority.P4:
      responseMinutes = config.p4ResponseMinutes;
      resolutionMinutes = config.p4ResolutionMinutes;
      break;
  }

  return {
    responseSlaDue: addMinutes(createdAt, responseMinutes),
    resolutionSlaDue: addMinutes(createdAt, resolutionMinutes),
  };
}
