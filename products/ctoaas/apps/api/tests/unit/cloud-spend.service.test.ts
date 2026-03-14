/**
 * Cloud Spend Service Unit Tests (Red Phase)
 *
 * Implements:
 *   FR-027 (Cloud Spend Analysis)
 *
 * These tests define expected behavior for CloudSpendService.
 * They WILL FAIL because CloudSpendService does not exist yet.
 *
 * [IMPL-058]
 */

let CloudSpendService: typeof import('../../src/services/cloud-spend.service').CloudSpendService;

beforeAll(async () => {
  try {
    const mod = await import('../../src/services/cloud-spend.service');
    CloudSpendService = mod.CloudSpendService;
  } catch {
    // Expected to fail in Red phase — service does not exist yet
  }
});

// ---------- helpers ----------

function sampleSpendBreakdown() {
  return {
    compute: 4500,
    storage: 1200,
    networking: 800,
    database: 2000,
    other: 500,
  };
}

function sampleCSV() {
  return [
    'category,amount',
    'compute,4500',
    'storage,1200',
    'networking,800',
    'database,2000',
    'other,500',
  ].join('\n');
}

function malformedCSV() {
  return 'this is not,valid\ncsv,with,wrong,columns\n';
}

function sampleSpendData() {
  return {
    provider: 'AWS' as const,
    totalMonthly: 9000,
    spendBreakdown: sampleSpendBreakdown(),
    companySize: 50,
  };
}

// ---------- suite ----------

describe('CloudSpendService', () => {
  describe('createManualEntry', () => {
    test('[FR-027][AC-1] stores spend breakdown by service category', () => {
      expect(CloudSpendService).toBeDefined();
      const service = new CloudSpendService();

      const breakdown = sampleSpendBreakdown();
      const entry = service.buildManualEntry({
        provider: 'AWS',
        spendBreakdown: breakdown,
        totalMonthly: 9000,
        periodStart: '2026-01-01',
        periodEnd: '2026-01-31',
      });

      expect(entry).toBeDefined();
      expect(entry.provider).toBe('AWS');
      expect(entry.spendBreakdown).toEqual(breakdown);
      expect(entry.totalMonthly).toBe(9000);
      expect(entry.importSource).toBe('MANUAL');

      // Breakdown categories should be preserved
      expect(entry.spendBreakdown.compute).toBe(4500);
      expect(entry.spendBreakdown.storage).toBe(1200);
      expect(entry.spendBreakdown.networking).toBe(800);
      expect(entry.spendBreakdown.database).toBe(2000);
      expect(entry.spendBreakdown.other).toBe(500);
    });
  });

  describe('parseCSV', () => {
    test('[FR-027][AC-2] parses CSV spend data', () => {
      expect(CloudSpendService).toBeDefined();
      const service = new CloudSpendService();

      const csv = sampleCSV();
      const result = service.parseCSV(csv);

      expect(result).toBeDefined();
      expect(result.spendBreakdown).toBeDefined();
      expect(result.totalMonthly).toBe(9000);
      expect(result.spendBreakdown.compute).toBe(4500);
      expect(result.spendBreakdown.storage).toBe(1200);
      expect(result.spendBreakdown.networking).toBe(800);
      expect(result.spendBreakdown.database).toBe(2000);
      expect(result.spendBreakdown.other).toBe(500);
    });

    test('[FR-027] rejects malformed CSV', () => {
      expect(CloudSpendService).toBeDefined();
      const service = new CloudSpendService();

      const csv = malformedCSV();
      expect(() => service.parseCSV(csv)).toThrow();
    });
  });

  describe('getBenchmarks', () => {
    test('[FR-027][AC-3] returns industry benchmarks by company size', () => {
      expect(CloudSpendService).toBeDefined();
      const service = new CloudSpendService();

      const benchmarks = service.getBenchmarks(50, 'AWS');

      expect(benchmarks).toBeDefined();

      // Should have per-category benchmarks
      expect(benchmarks.compute).toBeDefined();
      expect(typeof benchmarks.compute.median).toBe('number');
      expect(typeof benchmarks.compute.p25).toBe('number');
      expect(typeof benchmarks.compute.p75).toBe('number');

      expect(benchmarks.storage).toBeDefined();
      expect(benchmarks.database).toBeDefined();
      expect(benchmarks.networking).toBeDefined();

      // Should include total benchmark
      expect(benchmarks.totalMedian).toBeDefined();
      expect(typeof benchmarks.totalMedian).toBe('number');
      expect(benchmarks.totalMedian).toBeGreaterThan(0);
    });
  });

  describe('getRecommendations', () => {
    test('[FR-027][AC-4] identifies over-provisioned resources', () => {
      expect(CloudSpendService).toBeDefined();
      const service = new CloudSpendService();

      // Spend data where compute is above p75 benchmark
      const data = sampleSpendData();
      const recommendations = service.getRecommendations(data);

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);

      // Each recommendation should have category, finding, and savings estimate
      for (const rec of recommendations) {
        expect(rec.category).toBeDefined();
        expect(rec.finding).toBeDefined();
        expect(typeof rec.finding).toBe('string');
        expect(rec.potentialSavingsPercent).toBeDefined();
        expect(typeof rec.potentialSavingsPercent).toBe('number');
      }
    });
  });
});
