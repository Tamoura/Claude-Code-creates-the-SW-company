import { FastifyInstance } from 'fastify';
import { spawn } from 'child_process';
import { join } from 'path';
import { existsSync } from 'fs';
import { readdir } from 'fs/promises';
import { randomUUID } from 'crypto';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..', '..', '..', '..', '..');

interface TestRun {
  id: string;
  product: string;
  suite: string; // 'all' | 'regression' | specific test file
  status: 'queued' | 'running' | 'passed' | 'failed' | 'error';
  startedAt: string;
  completedAt: string | null;
  output: string;
  exitCode: number | null;
  specFiles: string[];
}

// In-memory store for test runs (sufficient for local dev tool)
const runs = new Map<string, TestRun>();

function getProductE2EDir(product: string): string {
  return join(REPO_ROOT, 'products', product, 'e2e');
}

async function listSpecFiles(e2eDir: string, suite: string): Promise<string[]> {
  const testsDir = join(e2eDir, 'tests');
  if (!existsSync(testsDir)) return [];

  if (suite === 'regression') {
    const regressionDir = join(testsDir, 'regression');
    if (!existsSync(regressionDir)) return [];
    return (await readdir(regressionDir))
      .filter(f => f.endsWith('.spec.ts') || f.endsWith('.test.ts'))
      .map(f => `tests/regression/${f}`);
  }

  if (suite !== 'all') {
    // Specific file
    return existsSync(join(e2eDir, suite)) ? [suite] : [];
  }

  // All tests
  const files: string[] = [];
  async function walk(dir: string, prefix: string) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        await walk(join(dir, entry.name), `${prefix}${entry.name}/`);
      } else if (entry.name.endsWith('.spec.ts') || entry.name.endsWith('.test.ts')) {
        files.push(`${prefix}${entry.name}`);
      }
    }
  }
  await walk(testsDir, 'tests/');
  return files;
}

export async function e2eRunnerRoutes(app: FastifyInstance) {
  // List products that have E2E tests
  app.get('/e2e-runner/products', async () => {
    const productsDir = join(REPO_ROOT, 'products');
    if (!existsSync(productsDir)) return { products: [] };

    const dirs = await readdir(productsDir);
    const products: Array<{
      name: string;
      hasE2E: boolean;
      hasRegression: boolean;
      specCount: number;
      regressionCount: number;
    }> = [];

    for (const dir of dirs) {
      const e2eDir = getProductE2EDir(dir);
      if (!existsSync(e2eDir)) continue;

      const allSpecs = await listSpecFiles(e2eDir, 'all');
      const regressionSpecs = await listSpecFiles(e2eDir, 'regression');

      if (allSpecs.length > 0) {
        products.push({
          name: dir,
          hasE2E: true,
          hasRegression: regressionSpecs.length > 0,
          specCount: allSpecs.length,
          regressionCount: regressionSpecs.length,
        });
      }
    }

    return { products };
  });

  // Trigger a test run
  app.post('/e2e-runner/run', async (request, reply) => {
    const { product, suite } = request.body as { product: string; suite?: string };

    if (!product) {
      return reply.code(400).send({ error: 'Product name is required' });
    }

    const e2eDir = getProductE2EDir(product);
    if (!existsSync(e2eDir)) {
      return reply.code(404).send({ error: `No E2E tests found for product: ${product}` });
    }

    const testSuite = suite || 'all';
    const specFiles = await listSpecFiles(e2eDir, testSuite);

    const runId = randomUUID();
    const run: TestRun = {
      id: runId,
      product,
      suite: testSuite,
      status: 'running',
      startedAt: new Date().toISOString(),
      completedAt: null,
      output: '',
      exitCode: null,
      specFiles,
    };
    runs.set(runId, run);

    // Build npx playwright test command
    const args = ['playwright', 'test'];
    if (testSuite === 'regression') {
      args.push('tests/regression/');
    } else if (testSuite !== 'all') {
      args.push(testSuite);
    }
    args.push('--reporter=list');

    const child = spawn('npx', args, {
      cwd: e2eDir,
      env: { ...process.env, FORCE_COLOR: '0' },
      shell: true,
    });

    child.stdout.on('data', (data: Buffer) => {
      run.output += data.toString();
    });

    child.stderr.on('data', (data: Buffer) => {
      run.output += data.toString();
    });

    child.on('close', (code: number | null) => {
      run.exitCode = code;
      run.status = code === 0 ? 'passed' : 'failed';
      run.completedAt = new Date().toISOString();
    });

    child.on('error', (err: Error) => {
      run.status = 'error';
      run.output += `\nProcess error: ${err.message}`;
      run.completedAt = new Date().toISOString();
    });

    return reply.code(202).send({
      runId,
      product,
      suite: testSuite,
      status: 'running',
      specFiles,
    });
  });

  // Get status of a test run
  app.get('/e2e-runner/status/:runId', async (request, reply) => {
    const { runId } = request.params as { runId: string };
    const run = runs.get(runId);

    if (!run) {
      return reply.code(404).send({ error: 'Test run not found' });
    }

    return {
      id: run.id,
      product: run.product,
      suite: run.suite,
      status: run.status,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      exitCode: run.exitCode,
      specFiles: run.specFiles,
      output: run.output,
    };
  });

  // List recent test runs
  app.get('/e2e-runner/runs', async (request) => {
    const { product } = request.query as { product?: string };
    let allRuns = Array.from(runs.values());

    if (product) {
      allRuns = allRuns.filter(r => r.product === product);
    }

    // Return most recent first, limit output size
    return {
      runs: allRuns
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
        .slice(0, 50)
        .map(r => ({
          id: r.id,
          product: r.product,
          suite: r.suite,
          status: r.status,
          startedAt: r.startedAt,
          completedAt: r.completedAt,
          exitCode: r.exitCode,
          specCount: r.specFiles.length,
        })),
    };
  });
}
