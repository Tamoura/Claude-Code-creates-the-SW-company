import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { repoPath } from './repo.service.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReadinessPhase = 'launch-now' | 'near-term' | 'medium-term' | 'deprioritize';

export interface MonetizationProduct {
  id: string;
  displayName: string;
  tagline: string;
  score: number;
  completion: number;
  ttrWeeksMin: number;
  ttrWeeksMax: number;
  marketSize: string;
  pricingModel: string;
  pricingDetail: string;
  phase: ReadinessPhase;
  isCommercial: boolean;
  blockers: string[];
  strengths: string[];
}

export interface MonetizationData {
  lastUpdated: string;
  products: MonetizationProduct[];
}

// ─── File path ────────────────────────────────────────────────────────────────

function dataPath(): string {
  return repoPath('.claude', 'monetization.json');
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export function getMonetizationData(): MonetizationData {
  const filePath = dataPath();

  if (!existsSync(filePath)) {
    const empty: MonetizationData = { lastUpdated: new Date().toISOString().slice(0, 10), products: [] };
    writeFileSync(filePath, JSON.stringify(empty, null, 2), 'utf-8');
    return empty;
  }

  try {
    const raw = readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as MonetizationData;
  } catch {
    return { lastUpdated: '', products: [] };
  }
}

// ─── Write (for future CEO edits via UI) ─────────────────────────────────────

export function updateProduct(id: string, patch: Partial<MonetizationProduct>): MonetizationProduct {
  const data = getMonetizationData();
  const idx = data.products.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error(`Product not found: ${id}`);

  const updated: MonetizationProduct = { ...data.products[idx], ...patch };
  data.products[idx] = updated;
  data.lastUpdated = new Date().toISOString().slice(0, 10);
  writeFileSync(dataPath(), JSON.stringify(data, null, 2), 'utf-8');
  return updated;
}
