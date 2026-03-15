/**
 * Knowledge Seed Script Unit Tests (Red Phase)
 *
 * Tests the seed-knowledge module that reads markdown files
 * from the knowledge/ directory and feeds them to IngestionService.
 *
 * [IMPL-041]
 */

import * as path from 'path';
import * as fs from 'fs';

let seedModule: typeof import('../../src/scripts/seed-knowledge');

beforeAll(async () => {
  try {
    seedModule = await import('../../src/scripts/seed-knowledge');
  } catch {
    // Expected to fail in Red phase
  }
});

// ---------- suite ----------

describe('seed-knowledge', () => {
  describe('discoverKnowledgeFiles', () => {
    test('finds all .md files in the knowledge directory', () => {
      expect(seedModule).toBeDefined();
      const knowledgeDir = path.join(__dirname, '../../knowledge');

      // Only run if knowledge dir exists
      if (!fs.existsSync(knowledgeDir)) {
        console.warn('Knowledge directory not found, skipping');
        return;
      }

      const files = seedModule.discoverKnowledgeFiles(knowledgeDir);
      expect(Array.isArray(files)).toBe(true);
      // Should find at least some files
      expect(files.length).toBeGreaterThan(0);

      // Each file should have expected properties
      for (const file of files) {
        expect(file.filePath).toMatch(/\.md$/);
        expect(typeof file.category).toBe('string');
        expect(file.category.length).toBeGreaterThan(0);
      }
    });

    test('extracts category from directory name', () => {
      expect(seedModule).toBeDefined();
      const knowledgeDir = path.join(__dirname, '../../knowledge');

      if (!fs.existsSync(knowledgeDir)) {
        console.warn('Knowledge directory not found, skipping');
        return;
      }

      const files = seedModule.discoverKnowledgeFiles(knowledgeDir);
      const categories = new Set(files.map((f) => f.category));

      // Should have categories matching our directory structure
      expect(categories.size).toBeGreaterThan(0);
    });
  });

  describe('parseKnowledgeFile', () => {
    test('extracts title from H1 heading', () => {
      expect(seedModule).toBeDefined();

      const content = '# Microservices vs Monolith\n\nSome content about architecture.';
      const result = seedModule.parseKnowledgeFile(content, 'architecture');

      expect(result.title).toBe('Microservices vs Monolith');
      expect(result.category).toBe('architecture');
      expect(result.content).toContain('architecture');
    });

    test('uses filename-derived title if no H1 found', () => {
      expect(seedModule).toBeDefined();

      const content = 'Content without a heading.';
      const result = seedModule.parseKnowledgeFile(
        content,
        'scaling',
        'load-balancing.md'
      );

      expect(result.title).toBe('Load Balancing');
      expect(result.category).toBe('scaling');
    });

    test('preserves full content for chunking', () => {
      expect(seedModule).toBeDefined();

      const content = '# Test Topic\n\nParagraph one.\n\nParagraph two with details.';
      const result = seedModule.parseKnowledgeFile(content, 'data-storage');

      expect(result.content).toContain('Paragraph one');
      expect(result.content).toContain('Paragraph two');
    });
  });

  describe('buildIngestInputs', () => {
    test('converts discovered files into IngestInput array', () => {
      expect(seedModule).toBeDefined();
      const knowledgeDir = path.join(__dirname, '../../knowledge');

      if (!fs.existsSync(knowledgeDir)) {
        console.warn('Knowledge directory not found, skipping');
        return;
      }

      const inputs = seedModule.buildIngestInputs(knowledgeDir);
      expect(Array.isArray(inputs)).toBe(true);

      for (const input of inputs) {
        expect(typeof input.title).toBe('string');
        expect(input.title.length).toBeGreaterThan(0);
        expect(typeof input.category).toBe('string');
        expect(typeof input.content).toBe('string');
        expect(input.content.length).toBeGreaterThan(0);
        expect(input.source).toBe('curated');
      }
    });
  });
});
