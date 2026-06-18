/**
 * Router Node — Intent Classification
 *
 * Classifies the user query into one of the agent tool categories
 * using keyword matching. Returns the tool name to invoke.
 *
 * Tool categories:
 *   - rag-search: knowledge base, best practices, how-to
 *   - risk-advisor: risk, vulnerability, threat, security, compliance
 *   - cost-analyzer: cost, price, budget, TCO, spend, ROI
 *   - radar-lookup: technology, framework, tool, adopt, assess
 *   - synthesizer: general / fallback
 *
 * [IMPL-032][FR-001][US-01]
 */

// --------------- keyword sets ---------------

const RISK_KEYWORDS = [
  'risk',
  'vulnerability',
  'threat',
  'security',
  'compliance',
  'audit',
  'breach',
  'attack',
  'exploit',
  'penetration',
  'soc2',
  'gdpr',
  'hipaa',
  'pci',
  'iso27001',
];

const COST_KEYWORDS = [
  'cost',
  'price',
  'budget',
  'tco',
  'spend',
  'roi',
  'expense',
  'billing',
  'pricing',
  'savings',
  'investment',
  'financial',
];

const RADAR_KEYWORDS = [
  'adopt',
  'assess',
  'technology',
  'framework',
  'tool',
  'language',
  'platform',
  'evaluate',
  'compare',
  'alternative',
  'replace',
  'migration',
];

const RAG_KEYWORDS = [
  'best practice',
  'how to',
  'what is',
  'explain',
  'guide',
  'pattern',
  'approach',
  'recommend',
  'strategy',
  'architecture',
  'design',
  'implement',
  'configure',
  'setup',
  'tutorial',
  'example',
  'reference',
];

// --------------- types ---------------

export type ToolRoute =
  | 'rag-search'
  | 'risk-advisor'
  | 'cost-analyzer'
  | 'radar-lookup'
  | 'synthesizer';

// --------------- node ---------------

/**
 * Classify a user query and return the tool name to route to.
 *
 * Priority order: risk > cost > radar > rag > synthesizer (fallback).
 * Risk/cost/security keywords are checked first because they are
 * more specific and actionable than general knowledge queries.
 */
export function routerNode(query: string): ToolRoute {
  const lower = query.toLowerCase();

  // Score each category by keyword hit count
  const riskScore = countHits(lower, RISK_KEYWORDS);
  const costScore = countHits(lower, COST_KEYWORDS);
  const radarScore = countHits(lower, RADAR_KEYWORDS);
  const ragScore = countHits(lower, RAG_KEYWORDS);

  // Pick the highest-scoring category
  const maxScore = Math.max(riskScore, costScore, radarScore, ragScore);

  if (maxScore === 0) {
    return 'synthesizer';
  }

  // Tie-breaking: priority order risk > cost > radar > rag
  if (riskScore === maxScore) return 'risk-advisor';
  if (costScore === maxScore) return 'cost-analyzer';
  if (radarScore === maxScore) return 'radar-lookup';
  return 'rag-search';
}

// --------------- helpers ---------------

function countHits(text: string, keywords: string[]): number {
  let count = 0;
  for (const kw of keywords) {
    if (text.includes(kw)) {
      count++;
    }
  }
  return count;
}
