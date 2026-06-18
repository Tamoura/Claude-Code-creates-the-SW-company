/**
 * Risk Service Unit Tests (Red Phase)
 *
 * Implements:
 *   FR-020 (Risk Dashboard & Scoring)
 *   FR-021 (Risk Generation from Company Profile)
 *
 * These tests define expected behavior for RiskService.
 * They WILL FAIL because RiskService does not exist yet.
 *
 * [IMPL-048]
 */

// RiskService will be created during Green phase
let RiskService: typeof import('../../src/services/risk.service').RiskService;

beforeAll(async () => {
  try {
    const mod = await import('../../src/services/risk.service');
    RiskService = mod.RiskService;
  } catch {
    // Expected to fail in Red phase — service does not exist yet
  }
});

// ---------- helpers ----------

/** Minimal company profile for risk generation tests */
function profileWithEolTech() {
  return {
    techStack: {
      languages: ['Python 2.7', 'Java 8'],
      frameworks: ['AngularJS', 'Rails 4'],
      databases: ['MySQL 5.5'],
    },
    cloudProvider: 'AWS',
    architectureNotes: 'Monolithic application',
    constraints: null,
    organization: {
      name: 'LegacyCo',
      industry: 'fintech',
      employeeCount: 15,
      growthStage: 'SERIES_A' as const,
      foundedYear: 2015,
      challenges: ['technical-debt', 'scaling-infrastructure'],
    },
  };
}

function profileWithSingleCloud() {
  return {
    techStack: {
      languages: ['TypeScript', 'Go'],
      frameworks: ['React', 'Fastify'],
      databases: ['PostgreSQL', 'DynamoDB', 'ElastiCache'],
    },
    cloudProvider: 'AWS',
    architectureNotes: 'All services on AWS. S3, Lambda, ECS, RDS, DynamoDB.',
    constraints: null,
    organization: {
      name: 'CloudCo',
      industry: 'saas',
      employeeCount: 40,
      growthStage: 'SERIES_B' as const,
      foundedYear: 2019,
      challenges: ['scaling-infrastructure'],
    },
  };
}

function profileWithComplianceGaps() {
  return {
    techStack: {
      languages: ['JavaScript'],
      frameworks: ['Express'],
      databases: ['MongoDB'],
    },
    cloudProvider: null,
    architectureNotes: null,
    constraints: null,
    organization: {
      name: 'StartupCo',
      industry: 'healthcare',
      employeeCount: 8,
      growthStage: 'SEED' as const,
      foundedYear: 2023,
      challenges: [],
    },
  };
}

function profileWithSmallTeam() {
  return {
    techStack: {
      languages: ['TypeScript', 'Python', 'Go', 'Rust', 'Java'],
      frameworks: ['React', 'Next.js', 'Fastify', 'Django', 'Spring Boot'],
      databases: ['PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch', 'Neo4j'],
    },
    cloudProvider: 'AWS',
    architectureNotes: 'Microservices with 30+ services, event sourcing, CQRS',
    constraints: null,
    organization: {
      name: 'ThinSpreadCo',
      industry: 'fintech',
      employeeCount: 5,
      growthStage: 'SEED' as const,
      foundedYear: 2024,
      challenges: ['hiring-senior-engineers'],
    },
  };
}

function incompleteProfile() {
  return {
    techStack: {},
    cloudProvider: null,
    architectureNotes: null,
    constraints: null,
    organization: {
      name: '',
      industry: '',
      employeeCount: 0,
      growthStage: 'SEED' as const,
      foundedYear: null,
      challenges: [],
    },
  };
}

/** Sample risk items for scoring tests */
function activeRisks() {
  return [
    {
      id: 'r1',
      category: 'TECH_DEBT' as const,
      title: 'Python 2.7 EOL',
      severity: 9,
      trend: 'WORSENING' as const,
      status: 'ACTIVE' as const,
    },
    {
      id: 'r2',
      category: 'TECH_DEBT' as const,
      title: 'AngularJS EOL',
      severity: 7,
      trend: 'STABLE' as const,
      status: 'ACTIVE' as const,
    },
    {
      id: 'r3',
      category: 'VENDOR' as const,
      title: 'Single cloud dependency',
      severity: 6,
      trend: 'STABLE' as const,
      status: 'ACTIVE' as const,
    },
    {
      id: 'r4',
      category: 'TECH_DEBT' as const,
      title: 'Old jQuery version',
      severity: 4,
      trend: 'IMPROVING' as const,
      status: 'MITIGATED' as const,
    },
    {
      id: 'r5',
      category: 'COMPLIANCE' as const,
      title: 'Missing SOC2',
      severity: 8,
      trend: 'STABLE' as const,
      status: 'ACTIVE' as const,
    },
    {
      id: 'r6',
      category: 'OPERATIONAL' as const,
      title: 'No disaster recovery plan',
      severity: 7,
      trend: 'WORSENING' as const,
      status: 'ACTIVE' as const,
    },
    {
      id: 'r7',
      category: 'VENDOR' as const,
      title: 'Deprecated API dependency',
      severity: 5,
      trend: 'STABLE' as const,
      status: 'DISMISSED' as const,
    },
  ];
}

// ---------- suite ----------

describe('RiskService', () => {
  describe('generateRisksFromProfile', () => {
    test('[FR-021][AC-1] generates tech-debt risks for EOL technologies', () => {
      expect(RiskService).toBeDefined();
      const service = new RiskService();

      const profile = profileWithEolTech();
      const risks = service.generateRisksFromProfile(profile);

      // Should produce at least one tech-debt risk
      const techDebtRisks = risks.filter(
        (r) => r.category === 'TECH_DEBT'
      );
      expect(techDebtRisks.length).toBeGreaterThan(0);

      // EOL technologies should have high severity (>= 7)
      for (const risk of techDebtRisks) {
        expect(risk.severity).toBeGreaterThanOrEqual(7);
        expect(risk.title).toBeDefined();
        expect(risk.description).toBeDefined();
      }
    });

    test('[FR-021][AC-2] generates vendor risks for single-cloud dependency', () => {
      expect(RiskService).toBeDefined();
      const service = new RiskService();

      const profile = profileWithSingleCloud();
      const risks = service.generateRisksFromProfile(profile);

      // Should produce at least one vendor risk
      const vendorRisks = risks.filter(
        (r) => r.category === 'VENDOR'
      );
      expect(vendorRisks.length).toBeGreaterThan(0);

      // Should mention cloud/vendor concentration
      const cloudRisk = vendorRisks.find(
        (r) =>
          r.title.toLowerCase().includes('cloud') ||
          r.title.toLowerCase().includes('vendor') ||
          r.description?.toLowerCase().includes('aws')
      );
      expect(cloudRisk).toBeDefined();
    });

    test('[FR-021][AC-3] generates compliance risks for missing security practices', () => {
      expect(RiskService).toBeDefined();
      const service = new RiskService();

      const profile = profileWithComplianceGaps();
      const risks = service.generateRisksFromProfile(profile);

      // Healthcare industry without constraints should produce compliance risks
      const complianceRisks = risks.filter(
        (r) => r.category === 'COMPLIANCE'
      );
      expect(complianceRisks.length).toBeGreaterThan(0);

      // Severity should be high for healthcare without compliance
      const highSeverity = complianceRisks.filter(
        (r) => r.severity >= 7
      );
      expect(highSeverity.length).toBeGreaterThan(0);
    });

    test('[FR-021][AC-4] generates operational risks based on team size vs complexity', () => {
      expect(RiskService).toBeDefined();
      const service = new RiskService();

      const profile = profileWithSmallTeam();
      const risks = service.generateRisksFromProfile(profile);

      // Small team (5) with large tech stack should produce operational risks
      const operationalRisks = risks.filter(
        (r) => r.category === 'OPERATIONAL'
      );
      expect(operationalRisks.length).toBeGreaterThan(0);

      // Should flag team capacity / complexity mismatch
      const capacityRisk = operationalRisks.find(
        (r) =>
          r.title.toLowerCase().includes('team') ||
          r.title.toLowerCase().includes('capacity') ||
          r.description?.toLowerCase().includes('team size')
      );
      expect(capacityRisk).toBeDefined();
    });

    test('[FR-021] skips risk generation when profile is incomplete', () => {
      expect(RiskService).toBeDefined();
      const service = new RiskService();

      const profile = incompleteProfile();
      const risks = service.generateRisksFromProfile(profile);

      // Incomplete profile should return empty array (not enough data)
      expect(risks).toEqual([]);
    });
  });

  describe('calculateCategoryScore', () => {
    test('[FR-020][AC-1] calculates average severity per category (1-10)', () => {
      expect(RiskService).toBeDefined();
      const service = new RiskService();

      const risks = activeRisks();

      // TECH_DEBT active risks: r1 (severity 9), r2 (severity 7)
      // r4 is MITIGATED so excluded → average = (9 + 7) / 2 = 8
      const score = service.calculateCategoryScore(risks, 'TECH_DEBT');
      expect(score).toBe(8);
      expect(score).toBeGreaterThanOrEqual(1);
      expect(score).toBeLessThanOrEqual(10);
    });

    test('[FR-020][AC-2] returns 0 for category with no active risks', () => {
      expect(RiskService).toBeDefined();
      const service = new RiskService();

      // No risks at all for this category
      const score = service.calculateCategoryScore([], 'TECH_DEBT');
      expect(score).toBe(0);
    });

    test('[FR-020][AC-3] excludes mitigated and dismissed risks from score', () => {
      expect(RiskService).toBeDefined();
      const service = new RiskService();

      const risks = activeRisks();

      // VENDOR risks: r3 (severity 6, ACTIVE), r7 (severity 5, DISMISSED)
      // Only r3 should count → score = 6
      const vendorScore = service.calculateCategoryScore(risks, 'VENDOR');
      expect(vendorScore).toBe(6);

      // TECH_DEBT risks: r1 (9, ACTIVE), r2 (7, ACTIVE), r4 (4, MITIGATED)
      // Only r1 and r2 should count → score = (9+7)/2 = 8
      const techDebtScore = service.calculateCategoryScore(
        risks,
        'TECH_DEBT'
      );
      expect(techDebtScore).toBe(8);
    });
  });

  describe('getRiskSummary', () => {
    test('[FR-020][AC-4] returns all 4 categories with scores and trends', () => {
      expect(RiskService).toBeDefined();
      const service = new RiskService();

      const risks = activeRisks();
      const summary = service.getRiskSummary(risks);

      // Must have all 4 categories
      expect(summary).toHaveLength(4);

      const categories = summary.map((s) => s.category);
      expect(categories).toContain('TECH_DEBT');
      expect(categories).toContain('VENDOR');
      expect(categories).toContain('COMPLIANCE');
      expect(categories).toContain('OPERATIONAL');

      // Each category should have score and trend
      for (const cat of summary) {
        expect(typeof cat.score).toBe('number');
        expect(cat.score).toBeGreaterThanOrEqual(0);
        expect(cat.score).toBeLessThanOrEqual(10);
        expect(['IMPROVING', 'STABLE', 'WORSENING']).toContain(cat.trend);
        expect(typeof cat.activeCount).toBe('number');
      }
    });

    test('[FR-020][AC-5] calculates trend from last 30 days of changes', () => {
      expect(RiskService).toBeDefined();
      const service = new RiskService();

      const risks = activeRisks();
      const summary = service.getRiskSummary(risks);

      // TECH_DEBT: r1 is WORSENING, r2 is STABLE → overall should be WORSENING or STABLE
      const techDebt = summary.find((s) => s.category === 'TECH_DEBT');
      expect(techDebt).toBeDefined();
      expect(['WORSENING', 'STABLE']).toContain(techDebt!.trend);

      // OPERATIONAL: only r6 which is WORSENING → should be WORSENING
      const operational = summary.find(
        (s) => s.category === 'OPERATIONAL'
      );
      expect(operational).toBeDefined();
      expect(operational!.trend).toBe('WORSENING');
    });
  });

  describe('updateRiskStatus', () => {
    test('[FR-020] transitions risk from active to mitigated', () => {
      expect(RiskService).toBeDefined();
      const service = new RiskService();

      const risk = {
        id: 'r1',
        status: 'ACTIVE' as const,
        mitigations: [] as string[],
      };

      const result = service.validateStatusTransition(
        risk.status,
        'MITIGATED'
      );
      expect(result.valid).toBe(true);
    });

    test('[FR-020] transitions risk from active to dismissed', () => {
      expect(RiskService).toBeDefined();
      const service = new RiskService();

      const risk = {
        id: 'r2',
        status: 'ACTIVE' as const,
        mitigations: [] as string[],
      };

      const result = service.validateStatusTransition(
        risk.status,
        'DISMISSED'
      );
      expect(result.valid).toBe(true);
    });
  });
});
