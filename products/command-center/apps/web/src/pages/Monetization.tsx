import { useState } from 'react';
import Badge from '../components/Badge.js';

// ─── Data ─────────────────────────────────────────────────────────────────────

type ReadinessPhase = 'launch-now' | 'near-term' | 'medium-term' | 'deprioritize';

interface ProductMono {
  id: string;
  displayName: string;
  tagline: string;
  score: number;           // 1–10
  completion: number;      // %
  ttrWeeksMin: number;
  ttrWeeksMax: number;
  marketSize: string;
  pricingModel: string;
  pricingDetail: string;
  phase: ReadinessPhase;
  blockers: string[];
  strengths: string[];
  isCommercial: boolean;   // false = internal / gov tool
}

const PRODUCTS: ProductMono[] = [
  {
    id: 'stablecoin-gateway',
    displayName: 'Stablecoin Gateway',
    tagline: 'Accept USDC/USDT at 0.5% — vs Stripe\'s 2.9%',
    score: 9,
    completion: 85,
    ttrWeeksMin: 2,
    ttrWeeksMax: 4,
    marketSize: '$1–5B',
    pricingModel: 'Transaction + SaaS',
    pricingDetail: '0.5% per transaction + optional $299–999/month premium tier',
    phase: 'launch-now',
    blockers: [],
    strengths: ['467+ passing tests', 'Full merchant dashboard', 'Docker + CI/CD ready', '95/100 OWASP compliance'],
    isCommercial: true,
  },
  {
    id: 'archforge',
    displayName: 'Archforge',
    tagline: 'AI-native enterprise architecture — TOGAF/ArchiMate/C4 from natural language',
    score: 8,
    completion: 80,
    ttrWeeksMin: 4,
    ttrWeeksMax: 8,
    marketSize: '$1.14B',
    pricingModel: 'Per-seat SaaS',
    pricingDetail: 'Free → $99/seat/month professional → Custom enterprise',
    phase: 'launch-now',
    blockers: ['Sales channel not established', 'Needs 1–2 pilot enterprise customers'],
    strengths: ['216 integration tests', 'Canvas editor + template gallery', 'OpenRouter AI integrated', '18 Prisma models'],
    isCommercial: true,
  },
  {
    id: 'connectin',
    displayName: 'ConnectIn',
    tagline: 'Arabic-first professional networking for 300M+ Arabic speakers',
    score: 7,
    completion: 78,
    ttrWeeksMin: 8,
    ttrWeeksMax: 12,
    marketSize: '$4.5B',
    pricingModel: 'Freemium + B2B Recruiting',
    pricingDetail: 'Free → $4.99/month premium → $299–999/month employer tiers',
    phase: 'near-term',
    blockers: ['Frontend Phase 1 (reactions/follow/block) incomplete', 'Recruiter dashboard not built'],
    strengths: ['1,193+ total tests', '26 E2E tests passing', '38 Prisma tables', 'Rare Arabic-first positioning'],
    isCommercial: true,
  },
  {
    id: 'recomengine',
    displayName: 'RecomEngine',
    tagline: 'Embeddable ML recommendations for mid-market e-commerce — no data science team needed',
    score: 7,
    completion: 75,
    ttrWeeksMin: 6,
    ttrWeeksMax: 10,
    marketSize: '$500M',
    pricingModel: 'SaaS + Usage-based',
    pricingDetail: 'Free <1M events → $299–799/month → $1,999+/month + per-event overage',
    phase: 'near-term',
    blockers: ['Analytics dashboard needs polish', 'No beta customers yet'],
    strengths: ['80+ integration tests', 'JavaScript SDK ready (<10KB)', 'A/B testing built-in', 'Multi-tenant from day 1'],
    isCommercial: true,
  },
  {
    id: 'muaththir',
    displayName: 'Muaththir',
    tagline: 'Holistic child development tracker — 6 dimensions including Islamic growth',
    score: 6,
    completion: 72,
    ttrWeeksMin: 10,
    ttrWeeksMax: 14,
    marketSize: '$200–500M',
    pricingModel: 'Freemium',
    pricingDetail: 'Free (1 child) → $9.99/month → $19.99/month family plan',
    phase: 'medium-term',
    blockers: ['No parent beta feedback yet', 'Mobile UX needs polish', 'Monetization model unvalidated'],
    strengths: ['Full radar charts + timeline UI', 'Islamic dimension unique differentiator', 'B2B channel via Islamic schools possible'],
    isCommercial: true,
  },
  {
    id: 'connectgrc',
    displayName: 'ConnectGRC',
    tagline: 'AI-native GRC talent platform — connecting risk/compliance professionals with employers',
    score: 6,
    completion: 70,
    ttrWeeksMin: 12,
    ttrWeeksMax: 16,
    marketSize: '$500M–1B',
    pricingModel: 'Freemium + B2B Recruiting',
    pricingDetail: 'Free → $9.99/month professional → $499–1,999/month employer portal',
    phase: 'medium-term',
    blockers: ['Admin panel 30% incomplete', 'Employer dashboard not started', 'No beta recruiters yet'],
    strengths: ['30+ API endpoints', 'Tier placement system', 'Career simulator built', 'Niche = defensible'],
    isCommercial: true,
  },
  {
    id: 'humanid',
    displayName: 'HumanID',
    tagline: 'Decentralized digital identity — W3C DIDs, verifiable credentials, zero-knowledge privacy',
    score: 5,
    completion: 68,
    ttrWeeksMin: 16,
    ttrWeeksMax: 24,
    marketSize: '$5–10B',
    pricingModel: 'B2B API',
    pricingDetail: '$99/month dev (10k verifications) → $999/month growth → Custom enterprise',
    phase: 'medium-term',
    blockers: ['Regulatory complexity (jurisdiction-sensitive)', 'No pilot enterprise customers', 'Blockchain load not tested'],
    strengths: ['37 API endpoints', 'Polygon L2 integration', 'ZKP privacy model', 'Massive TAM'],
    isCommercial: true,
  },
  {
    id: 'linkedin-agent',
    displayName: 'LinkedIn Agent',
    tagline: 'AI-powered Arabic/English LinkedIn content generation with trend analysis',
    score: 5,
    completion: 65,
    ttrWeeksMin: 6,
    ttrWeeksMax: 10,
    marketSize: '$50–150M',
    pricingModel: 'Freemium',
    pricingDetail: 'Free (2 posts/month) → $4.99/month pro → $14.99/month team',
    phase: 'medium-term',
    blockers: ['No beta user data', 'Carousel generator incomplete', 'High competition from ChatGPT plugins'],
    strengths: ['Arabic-first (rare)', 'OpenRouter multi-model routing', 'Format recommendation engine'],
    isCommercial: true,
  },
  {
    id: 'quantum-computing-usecases',
    displayName: 'Quantum Computing UC',
    tagline: 'Industry use-case directory for executives evaluating quantum computing investments',
    score: 4,
    completion: 60,
    ttrWeeksMin: 12,
    ttrWeeksMax: 20,
    marketSize: '$1–2B',
    pricingModel: 'Advisory / Consulting',
    pricingDetail: 'Free catalog → $99–199/month premium research → $5–15k expert consultation',
    phase: 'deprioritize',
    blockers: ['Market adoption 3–5 years away', 'No lead capture mechanism', 'Content becomes outdated fast'],
    strengths: ['Strong thought leadership positioning', 'Bilingual EN/AR', 'Niche with low competition today'],
    isCommercial: true,
  },
  {
    id: 'codeguardian',
    displayName: 'CodeGuardian',
    tagline: 'Multi-model AI code review routing specialized models per file type + GitHub PR integration',
    score: 2,
    completion: 10,
    ttrWeeksMin: 24,
    ttrWeeksMax: 36,
    marketSize: '$500M–1B',
    pricingModel: 'Freemium + Pro',
    pricingDetail: 'Free (public repos) → $99/month private → Custom enterprise',
    phase: 'deprioritize',
    blockers: ['Entire product unimplemented (design only)', 'No validated assumptions', 'GitHub integration untested'],
    strengths: ['Strong architecture documentation', 'DevSecOps TAM growing 28% CAGR', 'Could be internal tool first'],
    isCommercial: true,
  },
  {
    id: 'qdb-one',
    displayName: 'QDB One',
    tagline: 'Enterprise portal unifying Qatar Development Bank\'s three fragmented financing systems',
    score: 2,
    completion: 25,
    ttrWeeksMin: 0,
    ttrWeeksMax: 0,
    marketSize: 'N/A',
    pricingModel: 'Internal Tool',
    pricingDetail: 'Government enterprise — ROI in operational efficiency ($2–5M/year saved), not external revenue',
    phase: 'deprioritize',
    blockers: ['Backend not implemented', 'Requires SAML/OIDC with Qatar national auth (NAS)', '12–18 months to MVP'],
    strengths: ['Comprehensive architecture documentation', '10 ADRs', 'Full data model designed'],
    isCommercial: false,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PHASE_CONFIG: Record<ReadinessPhase, { label: string; color: string; bg: string; border: string; dot: string }> = {
  'launch-now':    { label: 'Launch Now',   color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
  'near-term':     { label: 'Near-Term',    color: 'text-indigo-400',  bg: 'bg-indigo-500/10',  border: 'border-indigo-500/30',  dot: 'bg-indigo-400'  },
  'medium-term':   { label: 'Medium-Term',  color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   dot: 'bg-amber-400'   },
  'deprioritize':  { label: 'Deprioritize', color: 'text-slate-500',   bg: 'bg-slate-800/50',   border: 'border-slate-700',      dot: 'bg-slate-600'   },
};

function scoreColor(score: number): string {
  if (score >= 8) return 'text-emerald-400';
  if (score >= 6) return 'text-indigo-400';
  if (score >= 4) return 'text-amber-400';
  return 'text-slate-500';
}

function scoreRingColor(score: number): string {
  if (score >= 8) return 'stroke-emerald-400';
  if (score >= 6) return 'stroke-indigo-400';
  if (score >= 4) return 'stroke-amber-400';
  return 'stroke-slate-600';
}

function ScoreDial({ score }: { score: number }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const fill = (score / 10) * circ;
  return (
    <div className="relative w-14 h-14 flex-shrink-0">
      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={r} fill="none" stroke="#1e293b" strokeWidth="4" />
        <circle
          cx="22" cy="22" r={r} fill="none" strokeWidth="4"
          strokeDasharray={`${fill} ${circ - fill}`}
          strokeLinecap="round"
          className={`transition-all ${scoreRingColor(score)}`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-sm font-bold tabular-nums ${scoreColor(score)}`}>{score}</span>
      </div>
    </div>
  );
}

function CompletionBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 65 ? 'bg-indigo-500' : pct >= 40 ? 'bg-amber-500' : 'bg-slate-600';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] text-slate-400 tabular-nums w-8 text-right">{pct}%</span>
    </div>
  );
}

function TTRBadge({ min, max, isCommercial }: { min: number; max: number; isCommercial: boolean }) {
  if (!isCommercial || (min === 0 && max === 0)) {
    return <span className="text-xs text-slate-600 italic">Not commercial</span>;
  }
  return (
    <span className="text-xs font-mono text-slate-300">
      {min}–{max} <span className="text-slate-500">wks</span>
    </span>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────

function ProductCard({ product, expanded, onToggle }: {
  product: ProductMono;
  expanded: boolean;
  onToggle: () => void;
}) {
  const phaseCfg = PHASE_CONFIG[product.phase];

  return (
    <div
      className={`bg-slate-900 border rounded-xl overflow-hidden transition-all ${
        product.phase === 'deprioritize' ? 'border-slate-800 opacity-60' : 'border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* Main row */}
      <div className="p-5 flex items-start gap-4">
        <ScoreDial score={product.score} />

        <div className="flex-1 min-w-0">
          {/* Title + phase */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-sm font-semibold text-white">{product.displayName}</h3>
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${phaseCfg.bg} ${phaseCfg.border} ${phaseCfg.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${phaseCfg.dot}`} />
              {phaseCfg.label}
            </span>
            {!product.isCommercial && <Badge variant="default">Internal</Badge>}
          </div>

          <p className="text-xs text-slate-500 mb-3 leading-relaxed">{product.tagline}</p>

          {/* Key metrics row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-2 mb-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-600 mb-0.5">Completion</p>
              <CompletionBar pct={product.completion} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-600 mb-0.5">Time to Revenue</p>
              <TTRBadge min={product.ttrWeeksMin} max={product.ttrWeeksMax} isCommercial={product.isCommercial} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-600 mb-0.5">Market Size</p>
              <span className="text-xs font-mono text-slate-300">{product.marketSize}</span>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-600 mb-0.5">Model</p>
              <span className="text-xs text-slate-400">{product.pricingModel}</span>
            </div>
          </div>

          {/* Pricing detail */}
          <p className="text-[11px] text-slate-500 italic mb-2">{product.pricingDetail}</p>

          {/* Blockers pill strip */}
          {product.blockers.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {product.blockers.map((b) => (
                <span key={b} className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400">
                  {b}
                </span>
              ))}
            </div>
          )}
          {product.blockers.length === 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              No critical blockers — ship-ready
            </span>
          )}
        </div>

        {/* Expand toggle */}
        <button
          onClick={onToggle}
          className="flex-shrink-0 text-slate-600 hover:text-slate-300 transition-colors mt-0.5"
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Expanded — strengths */}
      {expanded && (
        <div className="border-t border-slate-800 px-5 py-4 bg-slate-950/40">
          <p className="text-[10px] uppercase tracking-wider text-slate-600 mb-2">Why it can win</p>
          <div className="flex flex-wrap gap-2">
            {product.strengths.map((s) => (
              <span key={s} className="text-[11px] px-2.5 py-1 rounded-md bg-indigo-500/8 border border-indigo-500/20 text-indigo-300">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Phase Section ────────────────────────────────────────────────────────────

function PhaseSection({ phase, products, expandedId, onToggle }: {
  phase: ReadinessPhase;
  products: ProductMono[];
  expandedId: string | null;
  onToggle: (id: string) => void;
}) {
  if (products.length === 0) return null;
  const cfg = PHASE_CONFIG[phase];

  const phaseDescriptions: Record<ReadinessPhase, string> = {
    'launch-now':   'Product is built and tested. First revenue is weeks away, not months.',
    'near-term':    'Core product exists. A targeted push on gaps unlocks revenue within the quarter.',
    'medium-term':  'Requires beta validation or a specific feature gate before charging.',
    'deprioritize': 'Incomplete, not commercial, or market timing is off. Revisit in 12+ months.',
  };

  return (
    <section className="mb-10">
      <div className="flex items-center gap-3 mb-4">
        <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
        <h2 className={`text-base font-semibold ${cfg.color}`}>{cfg.label}</h2>
        <span className="text-slate-600 text-xs">·</span>
        <span className="text-xs text-slate-500">{phaseDescriptions[phase]}</span>
      </div>
      <div className="space-y-3">
        {products.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            expanded={expandedId === p.id}
            onToggle={() => onToggle(p.id)}
          />
        ))}
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Monetization() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activePhase, setActivePhase] = useState<ReadinessPhase | 'all'>('all');

  const toggle = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  const commercial = PRODUCTS.filter((p) => p.isCommercial);
  const launchReady = PRODUCTS.filter((p) => p.phase === 'launch-now').length;
  const avgScore = Math.round(commercial.reduce((s, p) => s + p.score, 0) / commercial.length * 10) / 10;
  const fastestTTR = Math.min(...commercial.filter((p) => p.ttrWeeksMin > 0).map((p) => p.ttrWeeksMin));

  const phases: ReadinessPhase[] = ['launch-now', 'near-term', 'medium-term', 'deprioritize'];

  const filtered = activePhase === 'all'
    ? PRODUCTS
    : PRODUCTS.filter((p) => p.phase === activePhase);

  const tabs: { key: ReadinessPhase | 'all'; label: string }[] = [
    { key: 'all', label: `All (${PRODUCTS.length})` },
    { key: 'launch-now', label: 'Launch Now' },
    { key: 'near-term', label: 'Near-Term' },
    { key: 'medium-term', label: 'Medium-Term' },
    { key: 'deprioritize', label: 'Deprioritize' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Monetization Radar</h1>
        <p className="text-slate-500 text-sm">
          Which products can generate revenue and how fast — ranked by readiness score
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">Portfolio Size</p>
          <p className="text-3xl font-bold text-white tabular-nums">{PRODUCTS.length}</p>
          <p className="text-xs text-slate-600 mt-0.5">{commercial.length} commercial products</p>
        </div>
        <div className="bg-slate-900 border border-emerald-500/20 rounded-xl p-4">
          <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">Launch-Ready</p>
          <p className="text-3xl font-bold text-emerald-400 tabular-nums">{launchReady}</p>
          <p className="text-xs text-slate-600 mt-0.5">Ship within weeks</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">Avg Score</p>
          <p className="text-3xl font-bold text-indigo-400 tabular-nums">{avgScore}<span className="text-lg text-slate-600">/10</span></p>
          <p className="text-xs text-slate-600 mt-0.5">Commercial products</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">Fastest TTR</p>
          <p className="text-3xl font-bold text-amber-400 tabular-nums">{fastestTTR}<span className="text-lg text-slate-600"> wks</span></p>
          <p className="text-xs text-slate-600 mt-0.5">Time to first revenue</p>
        </div>
      </div>

      {/* Strategy callout */}
      <div className="mb-8 bg-emerald-500/6 border border-emerald-500/20 rounded-xl p-5">
        <p className="text-sm font-semibold text-emerald-300 mb-2">Recommended sequence</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-400">
          <div>
            <p className="text-emerald-400 font-semibold mb-1">Months 1–3</p>
            <p>Ship <strong className="text-slate-200">Stablecoin Gateway</strong> immediately (no blockers). Start enterprise pilots for <strong className="text-slate-200">Archforge</strong> in parallel.</p>
          </div>
          <div>
            <p className="text-indigo-400 font-semibold mb-1">Months 4–6</p>
            <p>Complete <strong className="text-slate-200">ConnectIn</strong> frontend + recruiter portal. Launch <strong className="text-slate-200">RecomEngine</strong> beta with 10–15 e-commerce customers.</p>
          </div>
          <div>
            <p className="text-amber-400 font-semibold mb-1">Months 7–12</p>
            <p>Run beta validation for <strong className="text-slate-200">Muaththir</strong>, <strong className="text-slate-200">ConnectGRC</strong>, and <strong className="text-slate-200">HumanID</strong>. Prove pricing before scaling.</p>
          </div>
        </div>
      </div>

      {/* Tab filter */}
      <div className="flex gap-1 mb-6 bg-slate-900 border border-slate-800 rounded-lg p-1 w-fit flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActivePhase(tab.key)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activePhase === tab.key
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Product list by phase */}
      {activePhase === 'all' ? (
        phases.map((phase) => (
          <PhaseSection
            key={phase}
            phase={phase}
            products={PRODUCTS.filter((p) => p.phase === phase)}
            expandedId={expandedId}
            onToggle={toggle}
          />
        ))
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              expanded={expandedId === p.id}
              onToggle={() => toggle(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
