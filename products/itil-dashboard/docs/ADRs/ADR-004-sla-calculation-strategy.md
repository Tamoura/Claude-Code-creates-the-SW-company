# ADR-004: SLA Calculation Strategy

## Status
Accepted

## Context

The ITIL Dashboard requires SLA (Service Level Agreement) tracking for incidents. SLA calculations are complex because they must account for:

- Business hours (e.g., 9 AM - 5 PM)
- Working days (e.g., Monday - Friday)
- Holidays (organization-specific)
- Timezone differences
- Pause/resume functionality (when incidents are on hold)
- Different SLA targets per priority level

The PRD defines the following SLA targets:

| Priority | Response Time | Resolution Time |
|----------|---------------|-----------------|
| P1 - Critical | 15 minutes | 1 hour |
| P2 - High | 30 minutes | 4 hours |
| P3 - Medium | 2 hours | 8 hours |
| P4 - Low | 8 hours | 24 hours |

## Decision

### SLA Calculation Architecture

We will implement a custom SLA calculation module with the following approach:

**1. All times stored in UTC**
**2. Business hours calculated server-side**
**3. SLA timers use business hours only**
**4. Real-time display uses polling/calculation**

### Data Model

```prisma
model SLAConfig {
  id              String    @id @default(uuid())
  name            String    @unique  // e.g., "default", "premium"

  // Business hours (in minutes from midnight, UTC-relative stored as org timezone)
  businessStartMinutes  Int   @default(540)   // 9:00 AM = 9*60
  businessEndMinutes    Int   @default(1020)  // 5:00 PM = 17*60

  // Working days (0 = Sunday, 6 = Saturday)
  workingDays     Int[]    @default([1, 2, 3, 4, 5])  // Mon-Fri

  // Organization timezone
  timezone        String   @default("UTC")

  // SLA targets by priority (in minutes)
  p1ResponseMinutes    Int   @default(15)
  p1ResolutionMinutes  Int   @default(60)
  p2ResponseMinutes    Int   @default(30)
  p2ResolutionMinutes  Int   @default(240)
  p3ResponseMinutes    Int   @default(120)
  p3ResolutionMinutes  Int   @default(480)
  p4ResponseMinutes    Int   @default(480)
  p4ResolutionMinutes  Int   @default(1440)

  holidays        Holiday[]
  incidents       Incident[]

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model Holiday {
  id          String    @id @default(uuid())
  name        String
  date        DateTime  @db.Date
  slaConfigId String
  slaConfig   SLAConfig @relation(fields: [slaConfigId], references: [id])
}

model Incident {
  id              String    @id @default(uuid())
  // ... other fields

  priority        Priority

  // SLA tracking fields
  slaConfigId     String?
  slaConfig       SLAConfig? @relation(fields: [slaConfigId], references: [id])

  createdAt       DateTime  @default(now())
  firstResponseAt DateTime?
  resolvedAt      DateTime?

  // Pause tracking
  slaPauses       SLAPause[]

  // Computed SLA status (updated on changes)
  responseSlaDue      DateTime?
  resolutionSlaDue    DateTime?
  responseSlaStatus   SLAStatus  @default(ON_TRACK)
  resolutionSlaStatus SLAStatus  @default(ON_TRACK)
}

model SLAPause {
  id          String    @id @default(uuid())
  incidentId  String
  incident    Incident  @relation(fields: [incidentId], references: [id])
  pausedAt    DateTime
  resumedAt   DateTime?
  reason      String

  @@index([incidentId])
}

enum SLAStatus {
  ON_TRACK   // > 20% time remaining
  AT_RISK    // < 20% time remaining
  BREACHED   // Past due
  MET        // Completed within SLA
  PAUSED     // Currently on hold
}

enum Priority {
  P1
  P2
  P3
  P4
}
```

### Business Hours Calculation Algorithm

```typescript
interface BusinessHoursConfig {
  startMinutes: number;      // Minutes from midnight (e.g., 540 for 9:00 AM)
  endMinutes: number;        // Minutes from midnight (e.g., 1020 for 5:00 PM)
  workingDays: number[];     // 0-6, where 0 = Sunday
  timezone: string;          // IANA timezone (e.g., 'America/New_York')
  holidays: Date[];          // Holiday dates
}

/**
 * Calculate the deadline by adding business minutes to a start time
 */
function addBusinessMinutes(
  startTime: Date,
  businessMinutes: number,
  config: BusinessHoursConfig
): Date {
  const { startMinutes, endMinutes, workingDays, timezone, holidays } = config;
  const businessDayMinutes = endMinutes - startMinutes;

  let current = new Date(startTime);
  let remainingMinutes = businessMinutes;

  while (remainingMinutes > 0) {
    // Convert to business timezone
    const localDate = toTimezone(current, timezone);
    const dayOfWeek = localDate.getDay();
    const minuteOfDay = localDate.getHours() * 60 + localDate.getMinutes();

    // Check if current day is a working day and not a holiday
    const isWorkingDay = workingDays.includes(dayOfWeek) &&
                         !isHoliday(localDate, holidays);

    if (!isWorkingDay) {
      // Skip to next day at business start
      current = getNextBusinessDayStart(current, config);
      continue;
    }

    // If before business hours, skip to start
    if (minuteOfDay < startMinutes) {
      current = setMinuteOfDay(current, startMinutes, timezone);
      continue;
    }

    // If after business hours, skip to next day
    if (minuteOfDay >= endMinutes) {
      current = getNextBusinessDayStart(current, config);
      continue;
    }

    // We're within business hours
    const minutesLeftToday = endMinutes - minuteOfDay;

    if (remainingMinutes <= minutesLeftToday) {
      // Finish today
      current = addMinutes(current, remainingMinutes);
      remainingMinutes = 0;
    } else {
      // Use all remaining time today, continue tomorrow
      remainingMinutes -= minutesLeftToday;
      current = getNextBusinessDayStart(current, config);
    }
  }

  return current;
}

/**
 * Calculate elapsed business minutes between two times
 */
function getElapsedBusinessMinutes(
  startTime: Date,
  endTime: Date,
  config: BusinessHoursConfig,
  pauses: SLAPause[]
): number {
  // Calculate total business minutes
  let totalMinutes = calculateBusinessMinutes(startTime, endTime, config);

  // Subtract paused time
  for (const pause of pauses) {
    if (pause.resumedAt) {
      const pauseMinutes = calculateBusinessMinutes(
        pause.pausedAt,
        pause.resumedAt,
        config
      );
      totalMinutes -= pauseMinutes;
    }
  }

  return Math.max(0, totalMinutes);
}
```

### SLA Timer Service

```typescript
class SLATimerService {
  /**
   * Calculate SLA deadlines when an incident is created
   */
  async calculateSLADeadlines(incident: Incident): Promise<{
    responseSlaDue: Date;
    resolutionSlaDue: Date;
  }> {
    const config = await this.getSLAConfig(incident.slaConfigId);
    const targets = this.getSLATargets(incident.priority, config);

    const responseSlaDue = addBusinessMinutes(
      incident.createdAt,
      targets.responseMinutes,
      this.toBusinessHoursConfig(config)
    );

    const resolutionSlaDue = addBusinessMinutes(
      incident.createdAt,
      targets.resolutionMinutes,
      this.toBusinessHoursConfig(config)
    );

    return { responseSlaDue, resolutionSlaDue };
  }

  /**
   * Get current SLA status for an incident
   */
  async getSLAStatus(incident: Incident): Promise<{
    responseStatus: SLAStatus;
    resolutionStatus: SLAStatus;
    responseTimeRemaining: number | null;  // Business minutes
    resolutionTimeRemaining: number | null;
    responsePercentUsed: number;
    resolutionPercentUsed: number;
  }> {
    const config = await this.getSLAConfig(incident.slaConfigId);
    const targets = this.getSLATargets(incident.priority, config);
    const businessConfig = this.toBusinessHoursConfig(config);
    const now = new Date();

    // Response SLA
    let responseStatus: SLAStatus;
    let responseTimeRemaining: number | null = null;
    let responsePercentUsed = 0;

    if (incident.firstResponseAt) {
      // Response completed
      const elapsed = getElapsedBusinessMinutes(
        incident.createdAt,
        incident.firstResponseAt,
        businessConfig,
        incident.slaPauses
      );
      responsePercentUsed = (elapsed / targets.responseMinutes) * 100;
      responseStatus = elapsed <= targets.responseMinutes ? 'MET' : 'BREACHED';
    } else if (this.isPaused(incident)) {
      responseStatus = 'PAUSED';
    } else {
      // Response pending
      const elapsed = getElapsedBusinessMinutes(
        incident.createdAt,
        now,
        businessConfig,
        incident.slaPauses
      );
      responsePercentUsed = (elapsed / targets.responseMinutes) * 100;
      responseTimeRemaining = targets.responseMinutes - elapsed;

      if (responseTimeRemaining < 0) {
        responseStatus = 'BREACHED';
      } else if (responsePercentUsed >= 80) {
        responseStatus = 'AT_RISK';
      } else {
        responseStatus = 'ON_TRACK';
      }
    }

    // Resolution SLA (similar logic)
    let resolutionStatus: SLAStatus;
    let resolutionTimeRemaining: number | null = null;
    let resolutionPercentUsed = 0;

    if (incident.resolvedAt) {
      const elapsed = getElapsedBusinessMinutes(
        incident.createdAt,
        incident.resolvedAt,
        businessConfig,
        incident.slaPauses
      );
      resolutionPercentUsed = (elapsed / targets.resolutionMinutes) * 100;
      resolutionStatus = elapsed <= targets.resolutionMinutes ? 'MET' : 'BREACHED';
    } else if (this.isPaused(incident)) {
      resolutionStatus = 'PAUSED';
    } else {
      const elapsed = getElapsedBusinessMinutes(
        incident.createdAt,
        now,
        businessConfig,
        incident.slaPauses
      );
      resolutionPercentUsed = (elapsed / targets.resolutionMinutes) * 100;
      resolutionTimeRemaining = targets.resolutionMinutes - elapsed;

      if (resolutionTimeRemaining < 0) {
        resolutionStatus = 'BREACHED';
      } else if (resolutionPercentUsed >= 80) {
        resolutionStatus = 'AT_RISK';
      } else {
        resolutionStatus = 'ON_TRACK';
      }
    }

    return {
      responseStatus,
      resolutionStatus,
      responseTimeRemaining,
      resolutionTimeRemaining,
      responsePercentUsed: Math.min(100, responsePercentUsed),
      resolutionPercentUsed: Math.min(100, resolutionPercentUsed),
    };
  }
}
```

### Frontend Display

**SLA Badge Component:**

```typescript
interface SLABadgeProps {
  status: SLAStatus;
  timeRemaining: number | null;  // Business minutes
  percentUsed: number;
}

function SLABadge({ status, timeRemaining, percentUsed }: SLABadgeProps) {
  const colors = {
    ON_TRACK: 'bg-green-100 text-green-800',
    AT_RISK: 'bg-yellow-100 text-yellow-800',
    BREACHED: 'bg-red-100 text-red-800',
    MET: 'bg-blue-100 text-blue-800',
    PAUSED: 'bg-gray-100 text-gray-800',
  };

  return (
    <Badge className={colors[status]}>
      {status === 'ON_TRACK' && `${formatDuration(timeRemaining)} remaining`}
      {status === 'AT_RISK' && `${formatDuration(timeRemaining)} remaining`}
      {status === 'BREACHED' && `Breached by ${formatDuration(Math.abs(timeRemaining!))}`}
      {status === 'MET' && 'SLA Met'}
      {status === 'PAUSED' && 'On Hold'}
    </Badge>
  );
}
```

### Real-time Updates

- Dashboard refreshes SLA status every 60 seconds via polling
- Individual incident pages refresh every 30 seconds
- WebSocket support can be added in Phase 2 for real-time updates

### Pause/Resume Handling

When an incident goes "On Hold":
1. Create SLAPause record with current timestamp
2. Set incident SLA status to PAUSED
3. Stop counting business time

When an incident resumes:
1. Update SLAPause record with resumedAt timestamp
2. Recalculate SLA deadlines (extend by paused duration)
3. Update incident SLA status

## Consequences

### Positive

- **Accurate Calculations**: Business hours/holidays properly accounted for
- **Configurable**: Different SLA configs per organization/tier
- **Auditability**: Pause history tracked for compliance
- **Performance**: Calculations cached, not repeated unnecessarily

### Negative

- **Complexity**: Custom implementation requires thorough testing
- **Timezone Edge Cases**: DST transitions need careful handling
- **Polling Overhead**: Not true real-time (acceptable for MVP)

### Neutral

- **No Third-Party Dependency**: More control, more maintenance
- **Database Storage**: SLA status persisted for reporting

## Implementation Notes

### Dependencies

```json
{
  "date-fns": "^4.1.0",
  "date-fns-tz": "^3.1.0"
}
```

Using `date-fns-tz` for timezone handling, which integrates well with `date-fns`.

### Testing Strategy

1. Unit tests for business hours calculations
2. Tests with various timezones
3. Tests spanning DST transitions
4. Tests with holidays
5. Tests with pause/resume scenarios
6. Integration tests with real database

### Edge Cases to Handle

- Incident created outside business hours
- Incident resolved outside business hours
- Multiple pauses on same incident
- Timezone changes mid-incident
- Holiday added after incident created
- P1 incident (may require 24x7 SLA)

## Alternatives Considered

### 24x7 SLA Only
- Pros: Much simpler calculation
- Cons: Doesn't reflect business reality
- Why rejected: Users expect business hours support

### External SLA Service
- Pros: Specialized, well-tested
- Cons: Dependency, cost, integration complexity
- Why rejected: No suitable open source option found

### Calendar-Based (Store Each Business Day)
- Pros: Explicit, easy to audit
- Cons: Storage overhead, complex queries
- Why rejected: Algorithm-based is more efficient

## References

- [date-fns Documentation](https://date-fns.org/docs)
- [date-fns-tz Documentation](https://github.com/marnusw/date-fns-tz)
- [ITIL SLA Best Practices](https://www.atlassian.com/itsm/service-request-management/slas)
- [ISO 8601 Date/Time Standard](https://en.wikipedia.org/wiki/ISO_8601)
