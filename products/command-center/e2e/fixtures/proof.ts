import { test as base, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiLogEntry {
  url: string;
  method: string;
  requestBody: unknown;
  responseStatus: number;
  responseBody: unknown;
  durationMs: number;
  timestamp: string;
}

interface ProofFixtures {
  apiLog: ApiLogEntry[];
}

// ─── Proof directory root ─────────────────────────────────────────────────────

const PROOF_ROOT = join(process.cwd(), 'e2e-proof');

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}

// ─── Extended test fixture ────────────────────────────────────────────────────

export const proofTest = base.extend<ProofFixtures>({
  apiLog: [
    async ({ page }, use, testInfo) => {
      const log: ApiLogEntry[] = [];
      const requestTimes = new Map<string, number>();

      // Intercept outgoing requests
      page.on('request', (req) => {
        requestTimes.set(req.url(), Date.now());
      });

      // Capture responses
      page.on('response', async (res) => {
        const url = res.url();
        const startTime = requestTimes.get(url) ?? Date.now();
        const durationMs = Date.now() - startTime;
        requestTimes.delete(url);

        let responseBody: unknown = null;
        try {
          const contentType = res.headers()['content-type'] ?? '';
          if (contentType.includes('application/json')) {
            responseBody = await res.json();
          }
        } catch {
          // Non-JSON body or already consumed — skip
        }

        let requestBody: unknown = null;
        try {
          const raw = res.request().postData();
          if (raw) {
            requestBody = JSON.parse(raw);
          }
        } catch {
          // No body or non-JSON
        }

        log.push({
          url,
          method: res.request().method(),
          requestBody,
          responseStatus: res.status(),
          responseBody,
          durationMs,
          timestamp: new Date().toISOString(),
        });
      });

      await use(log);

      // ── After test: save artifacts ──────────────────────────────────────────

      const testSlug = slugify(testInfo.title);
      const proofDir = join(PROOF_ROOT, testSlug);
      mkdirSync(proofDir, { recursive: true });

      // API log
      const apiLogPath = join(proofDir, 'api-log.json');
      writeFileSync(apiLogPath, JSON.stringify(log, null, 2), 'utf-8');

      // Proof summary
      const status = testInfo.status ?? 'unknown';
      const duration = testInfo.duration ?? 0;
      const summary = [
        `# Proof Summary`,
        ``,
        `**Test**: ${testInfo.title}`,
        `**Status**: ${status}`,
        `**Duration**: ${duration}ms`,
        `**Recorded At**: ${new Date().toISOString()}`,
        ``,
        `## Artifacts`,
        ``,
        `| Artifact | Path |`,
        `|---|---|`,
        `| API Request Log | \`${apiLogPath}\` |`,
        `| Video | \`${join(proofDir, 'video.webm')}\` |`,
        `| Screenshots | \`${proofDir}/\` |`,
        ``,
        `## API Calls Recorded`,
        ``,
        log.length === 0
          ? '_No API calls intercepted._'
          : log
              .map(
                (e) =>
                  `- \`${e.method} ${e.url}\` → **${e.responseStatus}** (${e.durationMs}ms)`,
              )
              .join('\n'),
      ].join('\n');

      writeFileSync(join(proofDir, 'proof-summary.md'), summary, 'utf-8');
    },
    { auto: false },
  ],
});

export { expect };
