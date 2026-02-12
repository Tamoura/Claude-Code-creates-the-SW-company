import {
  DashboardDataSchema,
  ChildSchema,
  ObservationSchema,
  validateResponse,
} from '../../src/lib/api-schemas';

describe('API Schemas', () => {
  describe('ChildSchema', () => {
    const validChild = {
      id: 'child-1',
      name: 'Sarah',
      dateOfBirth: '2020-01-15',
      gender: 'female',
      ageBand: '3-4',
      photoUrl: null,
      medicalNotes: null,
      allergies: null,
      specialNeeds: null,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    it('validates a correct child object', () => {
      const result = ChildSchema.safeParse(validChild);
      expect(result.success).toBe(true);
    });

    it('validates a child with optional fields', () => {
      const child = {
        ...validChild,
        observationCount: 5,
        milestoneProgress: { total: 10, achieved: 3 },
      };
      const result = ChildSchema.safeParse(child);
      expect(result.success).toBe(true);
    });

    it('fails on missing required fields', () => {
      const { id: _, ...noId } = validChild;
      const result = ChildSchema.safeParse(noId);
      expect(result.success).toBe(false);
    });

    it('fails on invalid gender', () => {
      const result = ChildSchema.safeParse({
        ...validChild,
        gender: 'other',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('ObservationSchema', () => {
    const validObservation = {
      id: 'obs-1',
      childId: 'child-1',
      dimension: 'academic',
      content: 'Great reading progress today',
      sentiment: 'positive',
      observedAt: '2024-01-15T10:00:00Z',
      tags: ['reading', 'progress'],
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
    };

    it('validates a correct observation', () => {
      const result = ObservationSchema.safeParse(validObservation);
      expect(result.success).toBe(true);
    });

    it('validates with empty tags array', () => {
      const result = ObservationSchema.safeParse({
        ...validObservation,
        tags: [],
      });
      expect(result.success).toBe(true);
    });

    it('fails on missing content', () => {
      const { content: _, ...noContent } = validObservation;
      const result = ObservationSchema.safeParse(noContent);
      expect(result.success).toBe(false);
    });
  });

  describe('DashboardDataSchema', () => {
    const validDashboard = {
      childId: 'child-1',
      childName: 'Sarah',
      ageBand: '3-4',
      overallScore: 75.5,
      dimensions: [
        {
          dimension: 'academic',
          score: 80,
          factors: { observation: 30, milestone: 30, sentiment: 20 },
          observationCount: 5,
          milestoneProgress: { achieved: 8, total: 10 },
        },
      ],
      calculatedAt: '2024-01-01T00:00:00Z',
    };

    it('validates a correct dashboard response', () => {
      const result = DashboardDataSchema.safeParse(validDashboard);
      expect(result.success).toBe(true);
    });

    it('validates with null ageBand', () => {
      const result = DashboardDataSchema.safeParse({
        ...validDashboard,
        ageBand: null,
      });
      expect(result.success).toBe(true);
    });

    it('validates with empty dimensions', () => {
      const result = DashboardDataSchema.safeParse({
        ...validDashboard,
        dimensions: [],
      });
      expect(result.success).toBe(true);
    });

    it('fails on missing childId', () => {
      const { childId: _, ...noChildId } = validDashboard;
      const result = DashboardDataSchema.safeParse(noChildId);
      expect(result.success).toBe(false);
    });

    it('fails on invalid score type', () => {
      const result = DashboardDataSchema.safeParse({
        ...validDashboard,
        overallScore: 'high',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('validateResponse', () => {
    const validChild = {
      id: 'child-1',
      name: 'Sarah',
      dateOfBirth: '2020-01-15',
      gender: 'female',
      ageBand: '3-4',
      photoUrl: null,
      medicalNotes: null,
      allergies: null,
      specialNeeds: null,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    it('returns data when validation passes', () => {
      const result = validateResponse(ChildSchema, validChild, 'getChild');
      expect(result).toEqual(validChild);
    });

    it('returns data even when validation fails (graceful degradation)', () => {
      const invalidChild = { ...validChild, id: 123 }; // id should be string
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = validateResponse(
        ChildSchema,
        invalidChild,
        'getChild'
      );

      // Should still return the data
      expect(result).toEqual(invalidChild);

      // Should log a warning
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[API Validation]'),
        expect.anything()
      );

      consoleSpy.mockRestore();
    });

    it('logs the endpoint name in the warning', () => {
      const invalidChild = { ...validChild, id: 123 };
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      validateResponse(ChildSchema, invalidChild, 'getChild');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('getChild'),
        expect.anything()
      );

      consoleSpy.mockRestore();
    });
  });
});
