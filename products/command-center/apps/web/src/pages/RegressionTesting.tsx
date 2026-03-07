import { useState, useEffect, useRef, useCallback } from 'react';
import { useApi } from '../hooks/useApi.js';
import StatCard from '../components/StatCard.js';

const API_BASE = '/api/v1';

interface ProductInfo {
  name: string;
  hasE2E: boolean;
  hasRegression: boolean;
  specCount: number;
  regressionCount: number;
}

interface RunSummary {
  id: string;
  product: string;
  suite: string;
  status: 'queued' | 'running' | 'passed' | 'failed' | 'error';
  startedAt: string;
  completedAt: string | null;
  exitCode: number | null;
  specCount: number;
}

interface RunDetail extends RunSummary {
  output: string;
  specFiles: string[];
}

function productDisplayName(name: string): string {
  return name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    queued: 'bg-slate-700 text-slate-300',
    running: 'bg-blue-900/50 text-blue-300 animate-pulse',
    passed: 'bg-emerald-900/50 text-emerald-300',
    failed: 'bg-rose-900/50 text-rose-300',
    error: 'bg-orange-900/50 text-orange-300',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[status] || styles.queued}`}>
      {status.toUpperCase()}
    </span>
  );
}

function formatDuration(start: string, end: string | null): string {
  if (!end) return 'Running...';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

export default function RegressionTesting() {
  const { data: productsData, loading: productsLoading } = useApi<{ products: ProductInfo[] }>('/e2e-runner/products');
  const { data: runsData, refetch: refetchRuns } = useApi<{ runs: RunSummary[] }>('/e2e-runner/runs');

  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [selectedSuite, setSelectedSuite] = useState<string>('all');
  const [launching, setLaunching] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [activeRun, setActiveRun] = useState<RunDetail | null>(null);
  const outputRef = useRef<HTMLPreElement>(null);

  // Poll active run status
  useEffect(() => {
    if (!activeRunId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/e2e-runner/status/${activeRunId}`);
        if (res.ok) {
          const run: RunDetail = await res.json();
          setActiveRun(run);
          if (run.status !== 'running' && run.status !== 'queued') {
            clearInterval(interval);
            refetchRuns();
          }
        }
      } catch {
        // Ignore polling errors
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [activeRunId, refetchRuns]);

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [activeRun?.output]);

  const launchRun = useCallback(async () => {
    if (!selectedProduct) return;
    setLaunching(true);
    try {
      const res = await fetch(`${API_BASE}/e2e-runner/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: selectedProduct, suite: selectedSuite }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveRunId(data.runId);
        setActiveRun({
          id: data.runId,
          product: data.product,
          suite: data.suite,
          status: 'running',
          startedAt: new Date().toISOString(),
          completedAt: null,
          exitCode: null,
          specCount: data.specFiles.length,
          output: '',
          specFiles: data.specFiles,
        });
      }
    } finally {
      setLaunching(false);
    }
  }, [selectedProduct, selectedSuite]);

  const viewRun = useCallback(async (runId: string) => {
    try {
      const res = await fetch(`${API_BASE}/e2e-runner/status/${runId}`);
      if (res.ok) {
        const run: RunDetail = await res.json();
        setActiveRun(run);
        setActiveRunId(run.status === 'running' ? runId : null);
      }
    } catch {
      // Ignore
    }
  }, []);

  const products = productsData?.products ?? [];
  const runs = runsData?.runs ?? [];
  const totalSpecs = products.reduce((s, p) => s + p.specCount, 0);
  const totalRegression = products.reduce((s, p) => s + p.regressionCount, 0);
  const recentPassed = runs.filter(r => r.status === 'passed').length;
  const recentFailed = runs.filter(r => r.status === 'failed').length;

  if (productsLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-slate-800 rounded w-56 mb-2" />
        <div className="h-4 bg-slate-800 rounded w-96 mb-8" />
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-slate-800 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Regression Testing</h1>
        <p className="text-sm text-slate-400">
          Run E2E and regression test suites across all products. View results, screenshots, and videos.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard label="Products with E2E" value={products.length} color="blue" />
        <StatCard label="Total Spec Files" value={totalSpecs} color="purple" />
        <StatCard label="Regression Specs" value={totalRegression} color="orange" />
        <StatCard label="Recent Passed" value={recentPassed} color="green" />
        <StatCard label="Recent Failed" value={recentFailed} color="red" />
      </div>

      {/* Run Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Launch Test Run</h2>
        <div className="flex flex-wrap items-end gap-4">
          {/* Product selector */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-slate-500 uppercase tracking-wider font-medium mb-2">
              Product
            </label>
            <select
              value={selectedProduct}
              onChange={e => setSelectedProduct(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">Select a product...</option>
              {products.map(p => (
                <option key={p.name} value={p.name}>
                  {productDisplayName(p.name)} ({p.specCount} specs{p.hasRegression ? `, ${p.regressionCount} regression` : ''})
                </option>
              ))}
            </select>
          </div>

          {/* Suite selector */}
          <div className="min-w-[180px]">
            <label className="block text-xs text-slate-500 uppercase tracking-wider font-medium mb-2">
              Suite
            </label>
            <select
              value={selectedSuite}
              onChange={e => setSelectedSuite(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Tests</option>
              <option value="regression">Regression Only</option>
            </select>
          </div>

          {/* Run button */}
          <button
            onClick={launchRun}
            disabled={!selectedProduct || launching}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              !selectedProduct || launching
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-500'
            }`}
          >
            {launching ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Launching...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                </svg>
                Run Tests
              </>
            )}
          </button>
        </div>
      </div>

      {/* Active Run / Output */}
      {activeRun && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mb-8">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-white">
                {productDisplayName(activeRun.product)} — {activeRun.suite === 'all' ? 'All Tests' : activeRun.suite === 'regression' ? 'Regression Suite' : activeRun.suite}
              </h3>
              {statusBadge(activeRun.status)}
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span>{activeRun.specCount} spec files</span>
              <span>{formatDuration(activeRun.startedAt, activeRun.completedAt)}</span>
            </div>
          </div>

          {/* Spec files */}
          {activeRun.specFiles.length > 0 && (
            <div className="px-6 py-3 border-b border-slate-800/50 bg-slate-950/30">
              <div className="flex flex-wrap gap-2">
                {activeRun.specFiles.map(f => (
                  <span key={f} className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Output terminal */}
          <pre
            ref={outputRef}
            className="p-4 text-xs font-mono text-slate-300 bg-slate-950 max-h-[500px] overflow-auto whitespace-pre-wrap"
          >
            {activeRun.output || (activeRun.status === 'running' ? 'Waiting for output...' : 'No output')}
          </pre>
        </div>
      )}

      {/* Product Grid */}
      <h2 className="text-lg font-semibold text-white mb-4">Products</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        {products.map(p => (
          <div
            key={p.name}
            className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-600 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">{productDisplayName(p.name)}</h3>
              <div className="flex gap-2">
                {p.hasRegression && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-900/30 text-orange-400">
                    Regression
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-6 text-xs text-slate-400">
              <span>{p.specCount} specs</span>
              {p.hasRegression && <span>{p.regressionCount} regression</span>}
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { setSelectedProduct(p.name); setSelectedSuite('all'); launchRun(); }}
                className="text-xs px-3 py-1.5 rounded bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors"
              >
                Run All
              </button>
              {p.hasRegression && (
                <button
                  onClick={() => { setSelectedProduct(p.name); setSelectedSuite('regression'); launchRun(); }}
                  className="text-xs px-3 py-1.5 rounded bg-orange-600/20 text-orange-400 hover:bg-orange-600/30 transition-colors"
                >
                  Run Regression
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Runs History */}
      {runs.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-white mb-4">Recent Runs</h2>
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left">
                  <th className="px-4 py-3 text-xs text-slate-500 font-medium uppercase">Product</th>
                  <th className="px-4 py-3 text-xs text-slate-500 font-medium uppercase">Suite</th>
                  <th className="px-4 py-3 text-xs text-slate-500 font-medium uppercase">Status</th>
                  <th className="px-4 py-3 text-xs text-slate-500 font-medium uppercase">Specs</th>
                  <th className="px-4 py-3 text-xs text-slate-500 font-medium uppercase">Duration</th>
                  <th className="px-4 py-3 text-xs text-slate-500 font-medium uppercase">Started</th>
                  <th className="px-4 py-3 text-xs text-slate-500 font-medium uppercase"></th>
                </tr>
              </thead>
              <tbody>
                {runs.map(run => (
                  <tr key={run.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="px-4 py-3 text-white">{productDisplayName(run.product)}</td>
                    <td className="px-4 py-3 text-slate-400">{run.suite}</td>
                    <td className="px-4 py-3">{statusBadge(run.status)}</td>
                    <td className="px-4 py-3 text-slate-400">{run.specCount}</td>
                    <td className="px-4 py-3 text-slate-400">{formatDuration(run.startedAt, run.completedAt)}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{new Date(run.startedAt).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => viewRun(run.id)}
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
