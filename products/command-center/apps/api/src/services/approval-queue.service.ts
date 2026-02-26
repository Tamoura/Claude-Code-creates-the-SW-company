import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { repoPath } from './repo.service.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApprovalItem {
  id: string;
  type: 'checkpoint' | 'architecture' | 'deployment' | 'blocker';
  title: string;
  description: string;
  product: string | null;
  requestedBy: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  resolvedAt: string | null;
  resolvedNote: string | null;
}

// ─── Seed data (shown on first load when no queue file exists) ────────────────

const SEED_ITEMS: ApprovalItem[] = [
  {
    id: randomUUID(),
    type: 'checkpoint',
    title: 'Feature Complete: CEO Approval Queue',
    description:
      'The approval queue feature has passed all quality gates (unit tests, E2E, browser verification). Requesting CEO sign-off before merging to main.',
    product: 'command-center',
    requestedBy: 'orchestrator',
    requestedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    status: 'pending',
    resolvedAt: null,
    resolvedNote: null,
  },
  {
    id: randomUUID(),
    type: 'architecture',
    title: 'ADR: Adopt PostgreSQL for ConnectGRC',
    description:
      'Proposing PostgreSQL 15 as the primary database for ConnectGRC, replacing the current JSON file store. ER diagrams and migration plan attached in the ADR.',
    product: 'connectgrc',
    requestedBy: 'architect',
    requestedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
    resolvedAt: null,
    resolvedNote: null,
  },
  {
    id: randomUUID(),
    type: 'blocker',
    title: 'Production Deploy Blocked — Missing Secrets',
    description:
      'Deployment of stablecoin-gateway to Render is blocked. The STRIPE_WEBHOOK_SECRET and DATABASE_URL env vars are not set in the Render dashboard. CEO action required.',
    product: 'stablecoin-gateway',
    requestedBy: 'devops',
    requestedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    status: 'pending',
    resolvedAt: null,
    resolvedNote: null,
  },
];

// ─── File I/O helpers ─────────────────────────────────────────────────────────

function queuePath(): string {
  return repoPath('.claude', 'approval-queue.json');
}

function readQueue(): ApprovalItem[] {
  const filePath = queuePath();

  if (!existsSync(filePath)) {
    // Seed the file so the page is populated on first load
    writeFileSync(filePath, JSON.stringify(SEED_ITEMS, null, 2), 'utf-8');
    return SEED_ITEMS;
  }

  try {
    const raw = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as ApprovalItem[];
  } catch {
    return [];
  }
}

function writeQueue(items: ApprovalItem[]): void {
  writeFileSync(queuePath(), JSON.stringify(items, null, 2), 'utf-8');
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Returns all items — pending first (newest first within each group), then resolved. */
export function getQueue(): ApprovalItem[] {
  const items = readQueue();
  const pending = items
    .filter((i) => i.status === 'pending')
    .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  const resolved = items
    .filter((i) => i.status !== 'pending')
    .sort((a, b) => new Date(b.resolvedAt ?? b.requestedAt).getTime() - new Date(a.resolvedAt ?? a.requestedAt).getTime());
  return [...pending, ...resolved];
}

/** Approve an item by id, optionally recording a note. Throws if not found. */
export function approveItem(id: string, note?: string): ApprovalItem {
  const items = readQueue();
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) throw new Error(`Approval item not found: ${id}`);

  const updated: ApprovalItem = {
    ...items[idx],
    status: 'approved',
    resolvedAt: new Date().toISOString(),
    resolvedNote: note ?? null,
  };
  items[idx] = updated;
  writeQueue(items);
  return updated;
}

/** Reject an item by id, optionally recording a note. Throws if not found. */
export function rejectItem(id: string, note?: string): ApprovalItem {
  const items = readQueue();
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) throw new Error(`Approval item not found: ${id}`);

  const updated: ApprovalItem = {
    ...items[idx],
    status: 'rejected',
    resolvedAt: new Date().toISOString(),
    resolvedNote: note ?? null,
  };
  items[idx] = updated;
  writeQueue(items);
  return updated;
}

/** Add a new pending item to the queue. Returns the created item. */
export function addItem(
  item: Omit<ApprovalItem, 'id' | 'status' | 'resolvedAt' | 'resolvedNote'>,
): ApprovalItem {
  const items = readQueue();
  const newItem: ApprovalItem = {
    ...item,
    id: randomUUID(),
    status: 'pending',
    resolvedAt: null,
    resolvedNote: null,
  };
  items.push(newItem);
  writeQueue(items);
  return newItem;
}
