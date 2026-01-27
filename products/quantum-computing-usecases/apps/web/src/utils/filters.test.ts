import { describe, it, expect } from 'vitest';
import { filterUseCases, formatMaturityLevel, formatIndustry } from './filters';
import { UseCase } from '../types';

const mockUseCases: UseCase[] = [
  {
    id: '1',
    slug: 'test-case',
    title: 'Test Case',
    shortDescription: 'A test use case',
    fullDescription: 'Full description',
    industry: ['finance'],
    problemType: 'optimization',
    maturityLevel: 'experimental',
    quantumAdvantage: 'Advantage',
    timeline: { current: 'Now', nearTerm: 'Soon', longTerm: 'Later' },
    requirements: { qubits: 100, gateDepth: 500, errorRate: 0.01, coherenceTime: '50us' },
    examples: [],
    relatedUseCases: [],
    lastUpdated: '2026-01-01',
  },
];

describe('filterUseCases', () => {
  it('returns all use cases when no filters applied', () => {
    const result = filterUseCases(mockUseCases, {
      industries: [],
      problemTypes: [],
      maturityLevels: [],
      searchQuery: '',
    });
    expect(result).toHaveLength(1);
  });

  it('filters by industry', () => {
    const result = filterUseCases(mockUseCases, {
      industries: ['pharmaceuticals'],
      problemTypes: [],
      maturityLevels: [],
      searchQuery: '',
    });
    expect(result).toHaveLength(0);
  });

  it('filters by search query', () => {
    const result = filterUseCases(mockUseCases, {
      industries: [],
      problemTypes: [],
      maturityLevels: [],
      searchQuery: 'test',
    });
    expect(result).toHaveLength(1);
  });
});

describe('formatMaturityLevel', () => {
  it('formats maturity levels correctly', () => {
    expect(formatMaturityLevel('theoretical')).toBe('Theoretical');
    expect(formatMaturityLevel('production-ready')).toBe('Production Ready');
  });
});

describe('formatIndustry', () => {
  it('formats industries correctly', () => {
    expect(formatIndustry('finance')).toBe('Finance');
    expect(formatIndustry('ai-ml')).toBe('AI/ML');
  });
});
