/**
 * Profile Service Unit Tests (Red Phase)
 *
 * Implements:
 *   FR-008 (Company Profile / LLM Context)
 *   FR-009 (Profile Completeness Tracking)
 *
 * These tests define expected behavior for ProfileService.
 * They WILL FAIL because ProfileService does not exist yet.
 *
 * [IMPL-013]
 */

// ProfileService will be created during Green phase
// eslint-disable-next-line @typescript-eslint/no-require-imports
let ProfileService: typeof import('../../src/services/profile.service').ProfileService;

beforeAll(async () => {
  try {
    const mod = await import('../../src/services/profile.service');
    ProfileService = mod.ProfileService;
  } catch {
    // Expected to fail in Red phase — service does not exist yet
  }
});

// ---------- helpers ----------

function emptyProfile() {
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
    preferences: null,
  };
}

function step1Complete() {
  return {
    ...emptyProfile(),
    organization: {
      name: 'Acme Corp',
      industry: 'fintech',
      employeeCount: 50,
      growthStage: 'SERIES_A' as const,
      foundedYear: 2020,
      challenges: [],
    },
  };
}

function step2Complete() {
  return {
    ...step1Complete(),
    techStack: {
      languages: ['TypeScript', 'Python'],
      frameworks: ['React', 'Fastify'],
      databases: ['PostgreSQL', 'Redis'],
    },
    cloudProvider: 'AWS',
  };
}

function step3Complete() {
  return {
    ...step2Complete(),
    organization: {
      ...step2Complete().organization,
      challenges: [
        'scaling-infrastructure',
        'hiring-senior-engineers',
        'technical-debt',
      ],
    },
  };
}

function step4Complete() {
  return {
    ...step3Complete(),
    preferences: {
      communicationStyle: 'direct',
      responseFormat: 'structured',
      detailLevel: 'detailed',
    },
  };
}

// ---------- suite ----------

describe('ProfileService', () => {
  describe('calculateCompleteness', () => {
    test('[FR-009][AC-1] returns 0 for empty profile', () => {
      expect(ProfileService).toBeDefined();
      const service = new ProfileService();
      const result = service.calculateCompleteness(emptyProfile());
      expect(result).toBe(0);
    });

    test('[FR-009][AC-2] returns 25 for step 1 complete (company basics)', () => {
      expect(ProfileService).toBeDefined();
      const service = new ProfileService();
      const result = service.calculateCompleteness(step1Complete());
      expect(result).toBe(25);
    });

    test('[FR-009][AC-3] returns 50 for step 2 complete (tech stack)', () => {
      expect(ProfileService).toBeDefined();
      const service = new ProfileService();
      const result = service.calculateCompleteness(step2Complete());
      expect(result).toBe(50);
    });

    test('[FR-009][AC-4] returns 75 for step 3 complete (challenges)', () => {
      expect(ProfileService).toBeDefined();
      const service = new ProfileService();
      const result = service.calculateCompleteness(step3Complete());
      expect(result).toBe(75);
    });

    test('[FR-009][AC-5] returns 100 for all 4 steps complete', () => {
      expect(ProfileService).toBeDefined();
      const service = new ProfileService();
      const result = service.calculateCompleteness(step4Complete());
      expect(result).toBe(100);
    });

    test('[FR-009] returns partial % for partially filled steps', () => {
      expect(ProfileService).toBeDefined();
      const service = new ProfileService();

      // Step 1 partially filled — has industry but no employeeCount
      const partial = {
        ...emptyProfile(),
        organization: {
          ...emptyProfile().organization,
          industry: 'fintech',
          // employeeCount still 0, growthStage default
        },
      };

      const result = service.calculateCompleteness(partial);
      // Should be between 0 and 25 (partially through step 1)
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(25);
    });
  });

  describe('buildOrgContext', () => {
    test('[FR-008][AC-1] builds LLM context string from complete profile', () => {
      expect(ProfileService).toBeDefined();
      const service = new ProfileService();

      const profile = step4Complete();
      const result = service.buildOrgContext(profile);

      // Should be a non-empty string
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);

      // Should contain key organization details
      expect(result).toContain('Acme Corp');
      expect(result).toContain('fintech');
      expect(result).toContain('50');
      expect(result).toContain('TypeScript');
      expect(result).toContain('AWS');
      expect(result).toContain('scaling-infrastructure');
    });

    test('[FR-008][AC-2] handles missing optional fields gracefully', () => {
      expect(ProfileService).toBeDefined();
      const service = new ProfileService();

      const profile = {
        ...emptyProfile(),
        organization: {
          ...emptyProfile().organization,
          name: 'MinCo',
          industry: 'saas',
          employeeCount: 5,
          growthStage: 'SEED' as const,
        },
      };

      const result = service.buildOrgContext(profile);

      // Should not throw and should produce a string
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('MinCo');
      // Should not contain "undefined" or "null" literals
      expect(result).not.toContain('undefined');
      expect(result).not.toContain('null');
    });
  });
});
