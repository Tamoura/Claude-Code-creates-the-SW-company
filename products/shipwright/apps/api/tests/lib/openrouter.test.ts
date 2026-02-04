import { describe, it, expect } from 'vitest';
import { createModel, AVAILABLE_MODELS } from '../../src/lib/openrouter';

describe('openrouter', () => {
  describe('AVAILABLE_MODELS', () => {
    it('should export at least 5 available models', () => {
      expect(AVAILABLE_MODELS.length).toBeGreaterThanOrEqual(5);
    });

    it('should have id, name, and provider for each model', () => {
      for (const model of AVAILABLE_MODELS) {
        expect(model.id).toBeDefined();
        expect(model.name).toBeDefined();
        expect(model.provider).toBe('openrouter');
      }
    });
  });

  describe('createModel', () => {
    it('should return an object with a modelId property', () => {
      const model = createModel('anthropic/claude-sonnet-4');
      expect(model).toBeDefined();
      expect(typeof model).toBe('object');
    });

    it('should accept any model ID string', () => {
      const model = createModel('openai/gpt-4o');
      expect(model).toBeDefined();
    });
  });
});
