import { getAuditTrail, type AuditEntry } from './activity.service.js';

export interface AuditReport {
  total: number;
  entries: AuditEntry[];
  stats: {
    byAgent: Record<string, number>;
    byProduct: Record<string, number>;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
  };
  timeline: Array<{ date: string; count: number }>;
}

interface AuditFilters {
  agent?: string;
  product?: string;
  status?: string;
  limit?: number;
}

/** Build an aggregated audit report with stats and timeline */
export function getAuditReport(filters?: AuditFilters): AuditReport {
  let entries = getAuditTrail(500);

  // Apply filters
  if (filters?.agent) {
    entries = entries.filter((e) => e.agent === filters.agent);
  }
  if (filters?.product) {
    entries = entries.filter((e) => e.product === filters.product);
  }
  if (filters?.status) {
    entries = entries.filter((e) => e.status === filters.status);
  }

  // Compute stats
  const byAgent: Record<string, number> = {};
  const byProduct: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  const byType: Record<string, number> = {};
  const dateCount: Record<string, number> = {};

  for (const entry of entries) {
    if (entry.agent) byAgent[entry.agent] = (byAgent[entry.agent] ?? 0) + 1;
    if (entry.product) byProduct[entry.product] = (byProduct[entry.product] ?? 0) + 1;
    if (entry.status) byStatus[entry.status] = (byStatus[entry.status] ?? 0) + 1;
    if (entry.type) byType[entry.type] = (byType[entry.type] ?? 0) + 1;

    if (entry.timestamp) {
      const date = entry.timestamp.slice(0, 10); // YYYY-MM-DD
      dateCount[date] = (dateCount[date] ?? 0) + 1;
    }
  }

  // Build sorted timeline
  const timeline = Object.entries(dateCount)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Apply result limit after stats are computed
  const limitedEntries = filters?.limit ? entries.slice(0, filters.limit) : entries;

  return {
    total: entries.length,
    entries: limitedEntries,
    stats: { byAgent, byProduct, byStatus, byType },
    timeline,
  };
}
