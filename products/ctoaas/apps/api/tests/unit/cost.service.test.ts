/**
 * Cost Service Unit Tests (Red Phase)
 *
 * Implements:
 *   FR-023 (TCO Calculator)
 *
 * These tests define expected behavior for CostService.
 * They WILL FAIL because CostService does not exist yet.
 *
 * [IMPL-056]
 */

let CostService: typeof import('../../src/services/cost.service').CostService;

beforeAll(async () => {
  try {
    const mod = await import('../../src/services/cost.service');
    CostService = mod.CostService;
  } catch {
    // Expected to fail in Red phase — service does not exist yet
  }
});

// ---------- helpers ----------

/** Single TCO option for calculation */
function singleOption() {
  return {
    name: 'Build In-House',
    upfrontCost: 50000,
    monthlyCost: 5000,
    teamSize: 3,
    hourlyRate: 75,
    months: 6,
    scalingFactor: 1.1,
  };
}

/** Multiple options for side-by-side comparison */
function multipleOptions() {
  return [
    {
      name: 'Build In-House',
      upfrontCost: 50000,
      monthlyCost: 5000,
      teamSize: 3,
      hourlyRate: 75,
      months: 6,
      scalingFactor: 1.1,
    },
    {
      name: 'Buy SaaS',
      upfrontCost: 0,
      monthlyCost: 15000,
      teamSize: 1,
      hourlyRate: 75,
      months: 2,
      scalingFactor: 1.05,
    },
    {
      name: 'Open Source + Customize',
      upfrontCost: 10000,
      monthlyCost: 3000,
      teamSize: 2,
      hourlyRate: 75,
      months: 4,
      scalingFactor: 1.08,
    },
  ];
}

// ---------- suite ----------

describe('CostService', () => {
  describe('calculateTCO', () => {
    test('[FR-023][AC-1] calculates 3-year TCO for single option', () => {
      expect(CostService).toBeDefined();
      const service = new CostService();

      const option = singleOption();
      const result = service.calculateTCO(option);

      // Result should have total and year-by-year breakdown
      expect(result).toBeDefined();
      expect(result.totalCost).toBeDefined();
      expect(typeof result.totalCost).toBe('number');
      expect(result.totalCost).toBeGreaterThan(0);

      // Should have exactly 3 years
      expect(result.years).toBeDefined();
      expect(result.years).toHaveLength(3);
    });

    test('[FR-023][AC-2] calculates year-by-year breakdown', () => {
      expect(CostService).toBeDefined();
      const service = new CostService();

      const option = singleOption();
      const result = service.calculateTCO(option);

      // Year 1: upfront + (monthly x 12) + dev cost
      // upfront = 50000
      // monthly = 5000 x 12 = 60000
      // dev = 3 x 75 x 160 x 6 = 216000
      // Year 1 total = 50000 + 60000 + 216000 = 326000
      expect(result.years[0].year).toBe(1);
      expect(result.years[0].total).toBe(326000);
      expect(result.years[0].upfront).toBe(50000);
      expect(result.years[0].infrastructure).toBe(60000);
      expect(result.years[0].development).toBe(216000);

      // Year 2: (monthly x 12 x scalingFactor) + maintenance (15% of year-1)
      // infra = 5000 x 12 x 1.1 = 66000
      // maintenance = 326000 x 0.15 = 48900
      // Year 2 total = 66000 + 48900 = 114900
      expect(result.years[1].year).toBe(2);
      expect(result.years[1].infrastructure).toBe(66000);
      expect(result.years[1].maintenance).toBe(48900);
      expect(result.years[1].total).toBe(114900);

      // Year 3: (monthly x 12 x scalingFactor^2) + maintenance
      // infra = 5000 x 12 x 1.1^2 = 5000 x 12 x 1.21 = 72600
      // maintenance = 48900 (same as year 2)
      // Year 3 total = 72600 + 48900 = 121500
      expect(result.years[2].year).toBe(3);
      expect(result.years[2].infrastructure).toBe(72600);
      expect(result.years[2].maintenance).toBe(48900);
      expect(result.years[2].total).toBe(121500);
    });

    test('[FR-023][AC-3] compares multiple options side by side', () => {
      expect(CostService).toBeDefined();
      const service = new CostService();

      const options = multipleOptions();
      const comparison = service.compareOptions(options);

      expect(comparison).toBeDefined();
      expect(comparison.options).toHaveLength(3);

      // Each option should have name and totalCost
      for (const opt of comparison.options) {
        expect(opt.name).toBeDefined();
        expect(typeof opt.totalCost).toBe('number');
        expect(opt.totalCost).toBeGreaterThan(0);
        expect(opt.years).toHaveLength(3);
      }

      // Should identify the cheapest option
      expect(comparison.cheapest).toBeDefined();
      expect(typeof comparison.cheapest).toBe('string');

      // The cheapest should be the option with lowest totalCost
      const sortedByTotal = [...comparison.options].sort(
        (a, b) => a.totalCost - b.totalCost
      );
      expect(comparison.cheapest).toBe(sortedByTotal[0].name);
    });

    test('[FR-023][AC-4] includes dev cost (team x rate x months)', () => {
      expect(CostService).toBeDefined();
      const service = new CostService();

      const option = {
        name: 'Dev Heavy',
        upfrontCost: 0,
        monthlyCost: 0,
        teamSize: 5,
        hourlyRate: 100,
        months: 12,
        scalingFactor: 1.0,
      };

      const result = service.calculateTCO(option);

      // Dev cost = 5 x 100 x 160 x 12 = 960000
      expect(result.years[0].development).toBe(960000);
    });

    test('[FR-023][AC-5] includes infra cost with scaling factor', () => {
      expect(CostService).toBeDefined();
      const service = new CostService();

      const option = {
        name: 'Scaling Infra',
        upfrontCost: 0,
        monthlyCost: 10000,
        teamSize: 0,
        hourlyRate: 0,
        months: 0,
        scalingFactor: 1.2,
      };

      const result = service.calculateTCO(option);

      // Year 1 infra: 10000 x 12 = 120000
      expect(result.years[0].infrastructure).toBe(120000);

      // Year 2 infra: 10000 x 12 x 1.2 = 144000
      expect(result.years[1].infrastructure).toBe(144000);

      // Year 3 infra: 10000 x 12 x 1.2^2 = 10000 x 12 x 1.44 = 172800
      expect(result.years[2].infrastructure).toBe(172800);
    });

    test('[FR-023][AC-6] includes maintenance cost (15% of year-1 annually)', () => {
      expect(CostService).toBeDefined();
      const service = new CostService();

      const option = singleOption();
      const result = service.calculateTCO(option);

      // Year-1 total = 326000
      // Maintenance = 15% of 326000 = 48900
      const expectedMaintenance = result.years[0].total * 0.15;
      expect(result.years[1].maintenance).toBe(expectedMaintenance);
      expect(result.years[2].maintenance).toBe(expectedMaintenance);

      // Year 1 should have no maintenance
      expect(result.years[0].maintenance).toBe(0);
    });
  });
});
