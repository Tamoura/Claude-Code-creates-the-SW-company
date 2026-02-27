import { useState } from 'react';
import { useApi } from '../hooks/useApi.js';
import Badge from '../components/Badge.js';

// ─── Types ────────────────────────────────────────────────────────────────────

type ReadinessPhase = 'launch-now' | 'near-term' | 'medium-term' | 'deprioritize';

interface MonetizationProduct {
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

interface MonetizationData {
  lastUpdated: string;
  products: MonetizationProduct[];
}

// ─── Config ───────────────────────────────────────────────────────────────────

const PHASE_CONFIG: Record<ReadinessPhase, { label: string; color: string; bg: string; border: string; dot: string; desc: string }> = {
  'launch-now':   { label: 'Launch Now',   color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', dot: 'bg-emerald-400', desc: 'Product is built and tested. First revenue is weeks away, not months.' },
  'near-term':    { label: 'Near-Term',    color: 'text-indigo-400',  bg: 'bg-indigo-500/10',  border: 'border-indigo-500/30',  dot: 'bg-indigo-400',  desc: 'Core product exists. A targeted push on gaps unlocks revenue within the quarter.' },
  'medium-term':  { label: 'Medium-Term',  color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   dot: 'bg-amber-400',   desc: 'Requires beta validation or a specific feature gate before charging.' },
  'deprioritize': { label: 'Deprioritize', color: 'text-slate-500',   bg: 'bg-slate-800/50',   border: 'border-slate-700',      dot: 'bg-slate-600',   desc: 'Incomplete, not commercial, or market timing is off. Revisit in 12+ months.' },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function scoreRingColor(score: number): string {
  if (score >= 8) return 'stroke-emerald-400';
  if (score >= 6) return 'stroke-indigo-400';
  if (score >= 4) return 'stroke-amber-400';
  return 'stroke-slate-600';
}

function scoreTextColor(score: number): string {
  if (score >= 8) return 'text-emerald-400';
  if (score >= 6) return 'text-indigo-400';
  if (score >= 4) return 'text-amber-400';
  return 'text-slate-500';
}

function ScoreDial({ score }: { score: number }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const fill = (score / 10) * circ;
  return (
    <div className="relative w-14 h-14 flex-shrink-0">
      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={r} fill="none" stroke="#1e293b" strokeWidth="4" />
        <circle cx="22" cy="22" r={r} fill="none" strokeWidth="4"
          strokeDasharray={`${fill} ${circ - fill}`}
          strokeLinecap="round"
          className={`transition-all ${scoreRingColor(score)}`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-sm font-bold tabular-nums ${scoreTextColor(score)}`}>{score}</span>
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

function ProductCard({ product, expanded, onToggle }: {
  product: MonetizationProduct;
  expanded: boolean;
  onToggle: () => void;
}) {
  const phaseCfg = PHASE_CONFIG[product.phase];
  return (
    <div className={`bg-slate-900 border rounded-xl overflow-hidden transition-all ${product.phase === 'deprioritize' ? 'border-slate-800 opacity-60' : 'border-slate-800 hover:border-slate-700'}`}>
      <div className="p-5 flex items-start gap-4">
        <ScoreDial score={product.score} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-sm font-semibold text-white">{product.displayName}</h3>
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${phaseCfg.bg} ${phaseCfg.border} ${phaseCfg.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${phaseCfg.dot}`} />
              {phaseCfg.label}
            </span>
            {!product.isCommercial && <Badge variant="default">Internal</Badge>}
          </div>

          <p className="text-xs text-slate-500 mb-3 leading-relaxed">{product.tagline}</p>

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

          <p className="text-[11px] text-slate-500 italic mb-2">{product.pricingDetail}</p>

          {product.blockers.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {product.blockers.map((b) => (
                <span key={b} className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400">{b}</span>
              ))}
            </div>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              No critical blockers — ship-ready
            </span>
          )}
        </div>

        <button onClick={onToggle} className="flex-shrink-0 text-slate-600 hover:text-slate-300 transition-colors mt-0.5" aria-label={expanded ? 'Collapse' : 'Expand'}>
          <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {expanded && (
        <div className="border-t border-slate-800 px-5 py-4 bg-slate-950/40">
          <p className="text-[10px] uppercase tracking-wider text-slate-600 mb-2">Why it can win</p>
          <div className="flex flex-wrap gap-2">
            {product.strengths.map((s) => (
              <span key={s} className="text-[11px] px-2.5 py-1 rounded-md bg-indigo-500/8 border border-indigo-500/20 text-indigo-300">{s}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PhaseSection({ phase, products, expandedId, onToggle }: {
  phase: ReadinessPhase;
  products: MonetizationProduct[];
  expandedId: string | null;
  onToggle: (id: string) => void;
}) {
  if (products.length === 0) return null;
  const cfg = PHASE_CONFIG[phase];
  return (
    <section className="mb-10">
      <div className="flex items-center gap-3 mb-4">
        <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
        <h2 className={`text-base font-semibold ${cfg.color}`}>{cfg.label}</h2>
        <span className="text-slate-600 text-xs">·</span>
        <span className="text-xs text-slate-500">{cfg.desc}</span>
      </div>
      <div className="space-y-3">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} expanded={expandedId === p.id} onToggle={() => onToggle(p.id)} />
        ))}
      </div>
    </section>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-slate-800 rounded w-48 mb-2" />
      <div className="h-4 bg-slate-800 rounded w-72 mb-8" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-800 rounded-xl" />)}
      </div>
      <div className="h-24 bg-slate-800 rounded-xl mb-8" />
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => <div key={i} className="h-32 bg-slate-800 rounded-xl" />)}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Monetization() {
  const { data, loading } = useApi<MonetizationData>('/monetization');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activePhase, setActivePhase] = useState<ReadinessPhase | 'all'>('all');

  if (loading) return <LoadingSkeleton />;
  if (!data) return <p className="text-rose-400">Failed to load monetization data</p>;

  const toggle = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  const commercial = data.products.filter((p) => p.isCommercial);
  const launchReady = data.products.filter((p) => p.phase === 'launch-now').length;
  const avgScore = commercial.length > 0
    ? Math.round(commercial.reduce((s, p) => s + p.score, 0) / commercial.length * 10) / 10
    : 0;
  const fastestTTR = Math.min(...commercial.filter((p) => p.ttrWeeksMin > 0).map((p) => p.ttrWeeksMin));

  const phases: ReadinessPhase[] = ['launch-now', 'near-term', 'medium-term', 'deprioritize'];

  const tabs: { key: ReadinessPhase | 'all'; label: string }[] = [
    { key: 'all', label: `All (${data.products.length})` },
    { key: 'launch-now', label: 'Launch Now' },
    { key: 'near-term', label: 'Near-Term' },
    { key: 'medium-term', label: 'Medium-Term' },
    { key: 'deprioritize', label: 'Deprioritize' },
  ];

  const filtered = activePhase === 'all' ? data.products : data.products.filter((p) => p.phase === activePhase);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Monetization Radar</h1>
        <p className="text-slate-500 text-sm">
          Which products can generate revenue and how fast — ranked by readiness score
          {data.lastUpdated && <span className="ml-2 text-slate-600">· last updated {data.lastUpdated}</span>}
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">Portfolio Size</p>
          <p className="text-3xl font-bold text-white tabular-nums">{data.products.length}</p>
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
          <button key={tab.key} onClick={() => setActivePhase(tab.key)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activePhase === tab.key ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Product list */}
      {activePhase === 'all' ? (
        phases.map((phase) => (
          <PhaseSection key={phase} phase={phase}
            products={data.products.filter((p) => p.phase === phase)}
            expandedId={expandedId} onToggle={toggle}
          />
        ))
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} expanded={expandedId === p.id} onToggle={() => toggle(p.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
