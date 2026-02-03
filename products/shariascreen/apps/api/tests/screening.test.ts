import { ScreeningService } from '../src/services/screening.service';
import { ScreeningInput } from '../src/types';

describe('ScreeningService', () => {
  const service = new ScreeningService();

  // AAPL - Technology company, should be COMPLIANT
  const aaplData: ScreeningInput = {
    ticker: 'AAPL',
    name: 'Apple Inc.',
    sector: 'Technology',
    industry: 'Consumer Electronics',
    marketCap: 2800000000000,
    totalDebt: 120000000000,
    totalRevenue: 383000000000,
    interestIncome: 3900000000,
    cashAndEquivalents: 30000000000,
    accountsReceivable: 60000000000,
    nonPermissibleRevenue: 3900000000,
    dividendPerShare: 0.96,
    totalAssets: 352000000000,
  };

  // JPM - Bank, should be NON_COMPLIANT (financial services)
  const jpmData: ScreeningInput = {
    ticker: 'JPM',
    name: 'JPMorgan Chase & Co.',
    sector: 'Financial Services',
    industry: 'Banks - Diversified',
    marketCap: 540000000000,
    totalDebt: 350000000000,
    totalRevenue: 154000000000,
    interestIncome: 89000000000,
    cashAndEquivalents: 600000000000,
    accountsReceivable: 150000000000,
    nonPermissibleRevenue: 89000000000,
    dividendPerShare: 4.60,
    totalAssets: 3700000000000,
  };

  // A borderline stock - close to thresholds (DOUBTFUL)
  const borderlineData: ScreeningInput = {
    ticker: 'BORDER',
    name: 'Borderline Corp',
    sector: 'Industrials',
    industry: 'Conglomerates',
    marketCap: 100000000000,
    totalDebt: 29000000000, // 29% - within 5% of 30% threshold
    totalRevenue: 50000000000,
    interestIncome: 1000000000, // 2% - passes
    cashAndEquivalents: 10000000000, // 10% - passes
    accountsReceivable: 20000000000, // 20% - passes
    nonPermissibleRevenue: 1000000000, // 2% - passes
    dividendPerShare: 2.00,
    totalAssets: 80000000000,
  };

  // High debt stock - fails debt ratio
  const highDebtData: ScreeningInput = {
    ticker: 'DEBT',
    name: 'HighDebt Corp',
    sector: 'Utilities',
    industry: 'Electric Utilities',
    marketCap: 50000000000,
    totalDebt: 25000000000, // 50% ratio - exceeds 30%
    totalRevenue: 30000000000,
    interestIncome: 500000000,
    cashAndEquivalents: 5000000000,
    accountsReceivable: 8000000000,
    nonPermissibleRevenue: 500000000,
    dividendPerShare: 1.50,
    totalAssets: 60000000000,
  };

  describe('screenStock', () => {
    it('should return COMPLIANT for Apple (AAPL)', () => {
      const result = service.screenStock(aaplData);

      expect(result.ticker).toBe('AAPL');
      expect(result.name).toBe('Apple Inc.');
      expect(result.status).toBe('COMPLIANT');
      expect(result.standard).toBe('AAOIFI');
      expect(result.businessActivity.pass).toBe(true);
      expect(result.ratios.debtRatio).toBeLessThan(0.30);
      expect(result.ratios.interestIncomeRatio).toBeLessThan(0.05);
      expect(result.screenedAt).toBeDefined();
    });

    it('should return NON_COMPLIANT for JPMorgan (JPM)', () => {
      const result = service.screenStock(jpmData);

      expect(result.ticker).toBe('JPM');
      expect(result.status).toBe('NON_COMPLIANT');
      // JPM fails due to high interest income ratio
      expect(result.ratios.interestIncomeRatio).toBeGreaterThan(0.05);
    });

    it('should fail stocks with debt ratio above 30%', () => {
      const result = service.screenStock(highDebtData);

      expect(result.status).toBe('NON_COMPLIANT');
      expect(result.ratios.debtRatio).toBeGreaterThan(0.30);
    });

    it('should return DOUBTFUL for borderline stocks', () => {
      const result = service.screenStock(borderlineData);

      expect(result.status).toBe('DOUBTFUL');
      // Debt ratio is 29% which is within 5% of the 30% threshold
      expect(result.ratios.debtRatio).toBeGreaterThanOrEqual(0.285);
      expect(result.ratios.debtRatio).toBeLessThan(0.30);
    });

    it('should calculate purification amount correctly', () => {
      const result = service.screenStock(aaplData);

      // purification = (nonPermissibleRevenue / totalRevenue) * dividendPerShare
      // = (3,900,000,000 / 383,000,000,000) * 0.96
      const expectedPurification =
        (aaplData.nonPermissibleRevenue / aaplData.totalRevenue) *
        aaplData.dividendPerShare;

      expect(result.purification.amountPerShare).toBeCloseTo(
        expectedPurification,
        4
      );
      expect(result.purification.required).toBe(
        expectedPurification > 0
      );
    });

    it('should calculate all four financial ratios', () => {
      const result = service.screenStock(aaplData);

      expect(result.ratios).toHaveProperty('debtRatio');
      expect(result.ratios).toHaveProperty('interestIncomeRatio');
      expect(result.ratios).toHaveProperty('cashRatio');
      expect(result.ratios).toHaveProperty('receivablesRatio');

      // Verify calculations
      expect(result.ratios.debtRatio).toBeCloseTo(
        aaplData.totalDebt / aaplData.marketCap,
        4
      );
      expect(result.ratios.interestIncomeRatio).toBeCloseTo(
        aaplData.interestIncome / aaplData.totalRevenue,
        4
      );
      expect(result.ratios.cashRatio).toBeCloseTo(
        aaplData.cashAndEquivalents / aaplData.marketCap,
        4
      );
      expect(result.ratios.receivablesRatio).toBeCloseTo(
        aaplData.accountsReceivable / aaplData.marketCap,
        4
      );
    });

    it('should detect prohibited business activities', () => {
      // JPM is in Financial Services - should fail activity screen
      const result = service.screenStock(jpmData);
      expect(result.businessActivity.pass).toBe(false);
      expect(result.businessActivity.nonPermissibleRevenuePercent)
        .toBeGreaterThan(5);
    });
  });

  describe('screenBatch', () => {
    it('should screen multiple stocks and return summary', () => {
      const result = service.screenBatch([aaplData, jpmData]);

      expect(result.results).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.compliant).toBe(1);
      expect(result.meta.nonCompliant).toBe(1);
    });

    it('should handle empty batch', () => {
      const result = service.screenBatch([]);

      expect(result.results).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });

    it('should count all statuses correctly', () => {
      const result = service.screenBatch([
        aaplData,
        jpmData,
        borderlineData,
      ]);

      expect(result.meta.total).toBe(3);
      expect(result.meta.compliant).toBe(1);
      expect(result.meta.nonCompliant).toBe(1);
      expect(result.meta.doubtful).toBe(1);
    });
  });

  describe('generateReport', () => {
    it('should include detailed explanation', () => {
      const report = service.generateReport(aaplData);

      expect(report.explanation).toBeDefined();
      expect(report.explanation.length).toBeGreaterThan(50);
      expect(report.explanation).toContain('Debt');
      expect(report.explanation).toContain('Interest');
    });

    it('should include all screening data', () => {
      const report = service.generateReport(aaplData);

      expect(report.ticker).toBe('AAPL');
      expect(report.status).toBeDefined();
      expect(report.ratios).toBeDefined();
      expect(report.businessActivity).toBeDefined();
      expect(report.purification).toBeDefined();
    });
  });
});
