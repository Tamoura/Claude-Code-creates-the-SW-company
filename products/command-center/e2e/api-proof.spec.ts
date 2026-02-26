/**
 * API Proof Tests
 *
 * These tests use Playwright's `request` fixture (no browser) to prove every
 * API endpoint works and record evidence as JSON files.
 *
 * Artifacts land in: e2e-proof/api-proof/{endpoint-slug}.json
 */

import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const API_BASE = 'http://localhost:5009/api/v1';
const PROOF_DIR = join(process.cwd(), 'e2e-proof', 'api-proof');

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProofRecord {
  url: string;
  method: string;
  requestBody?: unknown;
  status: number;
  body: unknown;
  durationMs: number;
  recordedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function writeProof(slug: string, record: ProofRecord): void {
  writeFileSync(join(PROOF_DIR, `${slug}.json`), JSON.stringify(record, null, 2), 'utf-8');
}

// ─── Setup ────────────────────────────────────────────────────────────────────

test.beforeAll(() => {
  mkdirSync(PROOF_DIR, { recursive: true });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

test('GET /api/v1/health returns healthy status', async ({ request }) => {
  const url = `${API_BASE}/health`;
  const start = Date.now();
  const res = await request.get(url);
  const durationMs = Date.now() - start;
  const body = await res.json();

  writeProof('health', {
    url,
    method: 'GET',
    status: res.status(),
    body,
    durationMs,
    recordedAt: new Date().toISOString(),
  });

  expect(res.status()).toBe(200);
  expect(body).toHaveProperty('status', 'healthy');
});

test('GET /api/v1/overview returns stats object', async ({ request }) => {
  const url = `${API_BASE}/overview`;
  const start = Date.now();
  const res = await request.get(url);
  const durationMs = Date.now() - start;
  const body = await res.json();

  writeProof('overview', {
    url,
    method: 'GET',
    status: res.status(),
    body,
    durationMs,
    recordedAt: new Date().toISOString(),
  });

  expect(res.status()).toBe(200);
  expect(body).toHaveProperty('stats');
});

test('GET /api/v1/approval-queue returns items array', async ({ request }) => {
  const url = `${API_BASE}/approval-queue`;
  const start = Date.now();
  const res = await request.get(url);
  const durationMs = Date.now() - start;
  const body = await res.json();

  writeProof('approval-queue', {
    url,
    method: 'GET',
    status: res.status(),
    body,
    durationMs,
    recordedAt: new Date().toISOString(),
  });

  expect(res.status()).toBe(200);
  expect(body).toHaveProperty('items');
  expect(Array.isArray(body.items)).toBe(true);
});

test('GET /api/v1/pr-dashboard returns open array and stats object', async ({ request }) => {
  const url = `${API_BASE}/pr-dashboard`;
  const start = Date.now();
  const res = await request.get(url);
  const durationMs = Date.now() - start;
  const body = await res.json();

  writeProof('pr-dashboard', {
    url,
    method: 'GET',
    status: res.status(),
    body,
    durationMs,
    recordedAt: new Date().toISOString(),
  });

  expect(res.status()).toBe(200);
  expect(body).toHaveProperty('open');
  expect(Array.isArray(body.open)).toBe(true);
  expect(body).toHaveProperty('stats');
  expect(body.stats).toHaveProperty('open');
  expect(body.stats).toHaveProperty('total');
});

test('GET /api/v1/simulations/workflows returns workflows array', async ({ request }) => {
  const url = `${API_BASE}/simulations/workflows`;
  const start = Date.now();
  const res = await request.get(url);
  const durationMs = Date.now() - start;
  const body = await res.json();

  writeProof('simulations-workflows', {
    url,
    method: 'GET',
    status: res.status(),
    body,
    durationMs,
    recordedAt: new Date().toISOString(),
  });

  expect(res.status()).toBe(200);
  expect(body).toHaveProperty('workflows');
  expect(Array.isArray(body.workflows)).toBe(true);
});

test('PATCH /api/v1/approval-queue/:id/approve approves a pending item', async ({
  request,
}) => {
  // First, fetch the queue to find a pending item
  const listUrl = `${API_BASE}/approval-queue`;
  const listRes = await request.get(listUrl);
  expect(listRes.status()).toBe(200);
  const listBody = await listRes.json();
  expect(Array.isArray(listBody.items)).toBe(true);

  // If no pending items exist, create one first
  let itemId: string | undefined = listBody.items.find(
    (i: { status: string }) => i.status === 'pending',
  )?.id as string | undefined;

  if (!itemId) {
    const createRes = await request.post(listUrl, {
      data: {
        type: 'checkpoint',
        title: 'Proof Recording Test Item',
        description: 'Created by api-proof test to verify approve endpoint.',
        product: 'command-center',
        requestedBy: 'qa-engineer',
      },
    });
    expect(createRes.status()).toBe(201);
    const created = await createRes.json();
    itemId = created.item.id as string;
  }

  // Now approve the item
  const approveUrl = `${API_BASE}/approval-queue/${itemId}/approve`;
  const requestBody = { note: 'Approved during automated proof recording test.' };
  const start = Date.now();
  const res = await request.patch(approveUrl, { data: requestBody });
  const durationMs = Date.now() - start;
  const body = await res.json();

  writeProof('approval-queue-approve', {
    url: approveUrl,
    method: 'PATCH',
    requestBody,
    status: res.status(),
    body,
    durationMs,
    recordedAt: new Date().toISOString(),
  });

  expect(res.status()).toBe(200);
  expect(body).toHaveProperty('item');
  expect(body.item.status).toBe('approved');
  expect(body.item.id).toBe(itemId);
});
