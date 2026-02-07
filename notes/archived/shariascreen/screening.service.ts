import {
  ScreeningInput,
  ScreeningOutput,
  DetailedReport,
  BatchScreeningResponse,
  FinancialRatios,
  BusinessActivityResult,
  PurificationResult,
  ComplianceStatusType,
} from '../types';

// AAOIFI Thresholds
const THRESHOLDS = {
  DEBT_RATIO: 0.30,
  INTEREST_INCOME_RATIO: 0.05,
  CASH_RATIO: 0.30,
  RECEIVABLES_RATIO: 0.67,
  BUSINESS_ACTIVITY_LIMIT: 0.05,
  DOUBTFUL_MARGIN: 0.05, // within 5% of threshold
};

// Industries/sectors associated with prohibited activities
const PROHIBITED_INDUSTRIES = [
  'banks',
  'insurance',
  'financial services',
  'tobacco',
  'alcohol',
  'gambling',
  'casinos',
  'adult entertainment',
  'weapons',
  'defense',
  'pork',
  'brewers',
  'distillers',
  'vintners',
];

export class ScreeningService {
  /**
   * Screen a single stock against AAOIFI standard.
   */
  screenStock(input: ScreeningInput): ScreeningOutput {
    const ratios = this.calculateRatios(input);
    const businessActivity = this.checkBusinessActivity(input);
    const purification = this.calculatePurification(input);
    const status = this.determineStatus(ratios, businessActivity);

    return {
      ticker: input.ticker,
      name: input.name,
      status,
      standard: 'AAOIFI',
      ratios,
      businessActivity,
      purification,
      screenedAt: new Date().toISOString(),
    };
  }

  /**
   * Screen multiple stocks and return results with summary.
   */
  screenBatch(inputs: ScreeningInput[]): BatchScreeningResponse {
    const results = inputs.map((input) => this.screenStock(input));

    const meta = {
      total: results.length,
      compliant: results.filter(
        (r) => r.status === 'COMPLIANT'
      ).length,
      nonCompliant: results.filter(
        (r) => r.status === 'NON_COMPLIANT'
      ).length,
      doubtful: results.filter(
        (r) => r.status === 'DOUBTFUL'
      ).length,
    };

    return { results, meta };
  }

  /**
   * Generate a detailed compliance report with explanations.
   */
  generateReport(input: ScreeningInput): DetailedReport {
    const screening = this.screenStock(input);
    const explanation = this.buildExplanation(
      input,
      screening
    );
    return { ...screening, explanation };
  }

  private calculateRatios(input: ScreeningInput): FinancialRatios {
    return {
      debtRatio: input.totalDebt / input.marketCap,
      interestIncomeRatio:
        input.interestIncome / input.totalRevenue,
      cashRatio: input.cashAndEquivalents / input.marketCap,
      receivablesRatio:
        input.accountsReceivable / input.marketCap,
    };
  }

  private checkBusinessActivity(
    input: ScreeningInput
  ): BusinessActivityResult {
    const nonPermissiblePercent =
      (input.nonPermissibleRevenue / input.totalRevenue) * 100;

    const industryLower = input.industry.toLowerCase();
    const sectorLower = input.sector.toLowerCase();

    const isProhibitedIndustry = PROHIBITED_INDUSTRIES.some(
      (p) =>
        industryLower.includes(p) || sectorLower.includes(p)
    );

    const pass =
      nonPermissiblePercent <=
        THRESHOLDS.BUSINESS_ACTIVITY_LIMIT * 100 &&
      !isProhibitedIndustry;

    let details: string;
    if (isProhibitedIndustry) {
      details = `Industry "${input.industry}" in sector "${input.sector}" is associated with prohibited activities.`;
    } else if (!pass) {
      details = `Non-permissible revenue is ${nonPermissiblePercent.toFixed(2)}% of total revenue, exceeding the 5% threshold.`;
    } else {
      details = `Business activities are Shariah-compliant. Non-permissible revenue is ${nonPermissiblePercent.toFixed(2)}% of total revenue.`;
    }

    return {
      pass,
      details,
      nonPermissibleRevenuePercent: nonPermissiblePercent,
    };
  }

  private calculatePurification(
    input: ScreeningInput
  ): PurificationResult {
    const amountPerShare =
      (input.nonPermissibleRevenue / input.totalRevenue) *
      input.dividendPerShare;

    return {
      required: amountPerShare > 0,
      amountPerShare,
    };
  }

  private determineStatus(
    ratios: FinancialRatios,
    businessActivity: BusinessActivityResult
  ): ComplianceStatusType {
    // If business activity fails, it's non-compliant
    if (!businessActivity.pass) {
      return 'NON_COMPLIANT';
    }

    // Check each ratio against threshold
    const checks = [
      {
        value: ratios.debtRatio,
        limit: THRESHOLDS.DEBT_RATIO,
      },
      {
        value: ratios.interestIncomeRatio,
        limit: THRESHOLDS.INTEREST_INCOME_RATIO,
      },
      {
        value: ratios.cashRatio,
        limit: THRESHOLDS.CASH_RATIO,
      },
      {
        value: ratios.receivablesRatio,
        limit: THRESHOLDS.RECEIVABLES_RATIO,
      },
    ];

    // If any ratio exceeds threshold, non-compliant
    for (const check of checks) {
      if (check.value >= check.limit) {
        return 'NON_COMPLIANT';
      }
    }

    // If any ratio is within 5% of the threshold limit
    // (relative), mark as doubtful
    for (const check of checks) {
      const lowerBound =
        check.limit * (1 - THRESHOLDS.DOUBTFUL_MARGIN);
      if (check.value >= lowerBound) {
        return 'DOUBTFUL';
      }
    }

    return 'COMPLIANT';
  }

  private buildExplanation(
    input: ScreeningInput,
    result: ScreeningOutput
  ): string {
    const lines: string[] = [];

    lines.push(
      `=== AAOIFI Shariah Compliance Report for ${input.ticker} ===`
    );
    lines.push(
      `Company: ${input.name}`
    );
    lines.push(
      `Overall Status: ${result.status}`
    );
    lines.push('');

    // Business Activity
    lines.push('--- Business Activity Screen ---');
    lines.push(
      `Result: ${result.businessActivity.pass ? 'PASS' : 'FAIL'}`
    );
    lines.push(result.businessActivity.details);
    lines.push('');

    // Financial Ratios
    lines.push('--- Financial Ratio Screen ---');

    const ratioDetails = [
      {
        name: 'Debt Ratio',
        value: result.ratios.debtRatio,
        threshold: THRESHOLDS.DEBT_RATIO,
        formula: 'Total Debt / Market Cap',
      },
      {
        name: 'Interest Income Ratio',
        value: result.ratios.interestIncomeRatio,
        threshold: THRESHOLDS.INTEREST_INCOME_RATIO,
        formula: 'Interest Income / Total Revenue',
      },
      {
        name: 'Cash Ratio',
        value: result.ratios.cashRatio,
        threshold: THRESHOLDS.CASH_RATIO,
        formula: 'Cash & Equivalents / Market Cap',
      },
      {
        name: 'Receivables Ratio',
        value: result.ratios.receivablesRatio,
        threshold: THRESHOLDS.RECEIVABLES_RATIO,
        formula: 'Accounts Receivable / Market Cap',
      },
    ];

    for (const ratio of ratioDetails) {
      const pct = (ratio.value * 100).toFixed(2);
      const thresholdPct = (ratio.threshold * 100).toFixed(0);
      const pass = ratio.value < ratio.threshold;
      lines.push(
        `${ratio.name}: ${pct}% (threshold: ${thresholdPct}%) - ${pass ? 'PASS' : 'FAIL'}`
      );
      lines.push(`  Formula: ${ratio.formula}`);
    }

    lines.push('');

    // Purification
    lines.push('--- Purification ---');
    if (result.purification.required) {
      lines.push(
        `Purification required: $${result.purification.amountPerShare.toFixed(4)} per share`
      );
    } else {
      lines.push('No purification required.');
    }

    return lines.join('\n');
  }
}
