import './setup';
import { providers, getProviderBySlug, getProvidersForModel } from '../src/data/providers';

describe('Provider Registry', () => {
  describe('providers list', () => {
    it('should contain at least 10 providers', () => {
      expect(providers.length).toBeGreaterThanOrEqual(10);
    });

    it('should have unique slugs', () => {
      const slugs = providers.map(p => p.slug);
      const uniqueSlugs = new Set(slugs);
      expect(uniqueSlugs.size).toBe(slugs.length);
    });

    it('should have required fields for every provider', () => {
      for (const provider of providers) {
        expect(provider.slug).toBeTruthy();
        expect(provider.name).toBeTruthy();
        expect(provider.baseUrl).toBeTruthy();
        expect(provider.apiFormat).toBeTruthy();
        expect(provider.freeTier).toBeTruthy();
        expect(provider.models.length).toBeGreaterThan(0);
        expect(provider.keyAcquisitionUrl).toBeTruthy();
        expect(provider.keyAcquisitionGuide).toBeTruthy();
        expect(['up', 'down', 'degraded']).toContain(provider.healthStatus);
        expect(provider.authHeader).toBeTruthy();
      }
    });

    it('should have enriched fields for every provider', () => {
      for (const provider of providers) {
        expect(provider.description).toBeTruthy();
        expect(provider.category).toBeTruthy();
        expect(provider.lastVerified).toBeTruthy();
        expect(provider.prerequisites).toBeDefined();
        expect(Array.isArray(provider.prerequisites)).toBe(true);
        expect(provider.prerequisites.length).toBeGreaterThan(0);
      }
    });

    it('should have valid categories', () => {
      const validCategories = [
        'Multimodal', 'Speed', 'Edge AI', 'Open Source',
        'Enterprise', 'Aggregator', 'Reasoning',
      ];
      for (const provider of providers) {
        expect(validCategories).toContain(provider.category);
      }
    });

    it('should have structured key acquisition guides', () => {
      for (const provider of providers) {
        const guide = provider.keyAcquisitionGuide;
        expect(typeof guide).toBe('object');
        expect(Array.isArray(guide.steps)).toBe(true);
        expect(guide.steps.length).toBeGreaterThanOrEqual(5);
        expect(Array.isArray(guide.tips)).toBe(true);
        expect(guide.tips.length).toBeGreaterThan(0);
        expect(Array.isArray(guide.gotchas)).toBe(true);
        expect(guide.gotchas.length).toBeGreaterThan(0);
        expect(Array.isArray(guide.verificationSteps)).toBe(true);
        expect(guide.verificationSteps.length).toBeGreaterThan(0);

        for (const step of guide.steps) {
          expect(step.step).toBeGreaterThan(0);
          expect(step.instruction).toBeTruthy();
        }
      }
    });

    it('should have documentation links for every provider', () => {
      for (const provider of providers) {
        expect(provider.documentation).toBeDefined();
        expect(provider.documentation.quickstart).toBeTruthy();
        expect(provider.documentation.pricing).toBeTruthy();
        expect(provider.documentation.api).toBeTruthy();
      }
    });

    it('should have valid free tier limits for each provider', () => {
      for (const provider of providers) {
        const ft = provider.freeTier;
        const hasLimit = ft.requestsPerDay || ft.requestsPerMinute ||
          ft.requestsPerSecond || ft.requestsPerMonth ||
          ft.tokensPerDay || ft.tokensPerMonth ||
          ft.neuronsPerDay || ft.unlimited;
        expect(hasLimit).toBeTruthy();
      }
    });

    it('should include Google Gemini', () => {
      const gemini = providers.find(p => p.slug === 'google-gemini');
      expect(gemini).toBeDefined();
      expect(gemini!.name).toBe('Google Gemini');
      expect(gemini!.models.some(m => m.id.includes('gemini'))).toBe(true);
    });

    it('should include Groq', () => {
      const groq = providers.find(p => p.slug === 'groq');
      expect(groq).toBeDefined();
      expect(groq!.apiFormat).toBe('openai');
    });

    it('should include DeepSeek', () => {
      const deepseek = providers.find(p => p.slug === 'deepseek');
      expect(deepseek).toBeDefined();
      expect(deepseek!.models.length).toBeGreaterThan(0);
    });

    it('should include SambaNova with unlimited free tier', () => {
      const samba = providers.find(p => p.slug === 'sambanova');
      expect(samba).toBeDefined();
      expect(samba!.freeTier.unlimited).toBe(true);
    });
  });

  describe('getProviderBySlug', () => {
    it('should return the correct provider', () => {
      const groq = getProviderBySlug('groq');
      expect(groq).toBeDefined();
      expect(groq!.name).toBe('Groq');
    });

    it('should return undefined for unknown slug', () => {
      const unknown = getProviderBySlug('nonexistent-provider');
      expect(unknown).toBeUndefined();
    });
  });

  describe('getProvidersForModel', () => {
    it('should find providers offering a specific model', () => {
      const results = getProvidersForModel('llama-3.3-70b-versatile');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].slug).toBe('groq');
    });

    it('should return empty array for unknown model', () => {
      const results = getProvidersForModel('nonexistent-model');
      expect(results).toEqual([]);
    });
  });
});
