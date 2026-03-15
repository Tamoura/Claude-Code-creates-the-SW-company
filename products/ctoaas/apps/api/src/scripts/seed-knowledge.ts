/**
 * Knowledge Base Seed Script
 *
 * Discovers markdown files from the knowledge/ directory,
 * parses them into IngestInput format, and feeds them to
 * the IngestionService for chunking and embedding.
 *
 * Usage:
 *   npx tsx src/scripts/seed-knowledge.ts
 *
 * Traces to: US-03, FR-005, IMPL-041
 */

import * as fs from 'fs';
import * as path from 'path';
import type { IngestInput } from '../services/ingestion.service';

// --------------- types ---------------

export interface DiscoveredFile {
  filePath: string;
  category: string;
  fileName: string;
}

export interface ParsedFile {
  title: string;
  category: string;
  content: string;
}

// --------------- discovery ---------------

/**
 * Scan the knowledge directory for .md files.
 * Directory structure: knowledge/{category}/{topic}.md
 */
export function discoverKnowledgeFiles(knowledgeDir: string): DiscoveredFile[] {
  const files: DiscoveredFile[] = [];

  if (!fs.existsSync(knowledgeDir)) {
    return files;
  }

  const categories = fs.readdirSync(knowledgeDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const category of categories) {
    const categoryDir = path.join(knowledgeDir, category);
    const mdFiles = fs.readdirSync(categoryDir)
      .filter((f) => f.endsWith('.md'));

    for (const fileName of mdFiles) {
      files.push({
        filePath: path.join(categoryDir, fileName),
        category,
        fileName,
      });
    }
  }

  return files;
}

// --------------- parsing ---------------

/**
 * Parse a markdown file to extract title, category, and content.
 * Title is derived from the first H1 heading, or from the filename.
 */
export function parseKnowledgeFile(
  content: string,
  category: string,
  fileName?: string
): ParsedFile {
  // Extract title from first H1
  const h1Match = content.match(/^#\s+(.+)$/m);
  let title: string;

  if (h1Match) {
    title = h1Match[1].trim();
  } else if (fileName) {
    // Derive from filename: "load-balancing.md" → "Load Balancing"
    title = fileName
      .replace(/\.md$/, '')
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  } else {
    title = 'Untitled';
  }

  return { title, category, content };
}

// --------------- builder ---------------

/**
 * Build IngestInput array from all knowledge files in a directory.
 */
export function buildIngestInputs(knowledgeDir: string): IngestInput[] {
  const files = discoverKnowledgeFiles(knowledgeDir);

  return files.map((file) => {
    const raw = fs.readFileSync(file.filePath, 'utf-8');
    const parsed = parseKnowledgeFile(raw, file.category, file.fileName);

    return {
      title: parsed.title,
      category: parsed.category,
      content: parsed.content,
      source: 'curated',
    };
  });
}

// --------------- CLI runner ---------------

async function main() {
  const { PrismaClient } = await import('@prisma/client');
  const { IngestionService } = await import('../services/ingestion.service');

  const prisma = new PrismaClient();
  const service = new IngestionService(prisma);

  const knowledgeDir = path.join(__dirname, '../../knowledge');
  console.log(`Scanning: ${knowledgeDir}`);

  const inputs = buildIngestInputs(knowledgeDir);
  console.log(`Found ${inputs.length} knowledge files`);

  if (inputs.length === 0) {
    console.log('No files to ingest.');
    await prisma.$disconnect();
    return;
  }

  const results = await service.ingestBatch(inputs);

  let indexed = 0;
  let failed = 0;
  for (const r of results) {
    if (r.status === 'indexed') {
      console.log(`  ✓ ${r.title} (${r.chunkCount} chunks)`);
      indexed++;
    } else {
      console.log(`  ✗ ${r.title}: ${r.error}`);
      failed++;
    }
  }

  console.log(`\nDone: ${indexed} indexed, ${failed} failed`);
  await prisma.$disconnect();
}

// Run if called directly
if (require.main === module) {
  main().catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  });
}
