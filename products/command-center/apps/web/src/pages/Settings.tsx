import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi.js';
import Badge from '../components/Badge.js';

interface PortEntry {
  product: string;
  frontendPort: number | null;
  backendPort: number | null;
}

interface AgentEntry {
  id: string;
  name: string;
  hasExperience: boolean;
}

interface ProductEntry {
  name: string;
  phase: string;
}

interface SystemInfo {
  version: string;
  nodeVersion: string;
  gitBranch: string;
}

interface SettingsData {
  ports: PortEntry[];
  agents: AgentEntry[];
  products: ProductEntry[];
  system: SystemInfo;
}

type Tab = 'ports' | 'agents' | 'products';

export default function Settings() {
  const { data, loading } = useApi<SettingsData>('/settings');
  const [activeTab, setActiveTab] = useState<Tab>('ports');

  if (loading) return <LoadingSkeleton />;
  if (!data) return <p className="text-rose-400">Failed to load settings</p>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'ports', label: 'Port Registry' },
    { key: 'agents', label: 'Agent Registry' },
    { key: 'products', label: 'Product Registry' },
  ];

  const phaseVariant = (phase: string) => {
    if (phase === 'Production') return 'success' as const;
    if (phase === 'MVP') return 'info' as const;
    if (phase === 'Foundation') return 'warning' as const;
    return 'default' as const;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Settings & Configuration</h1>
      <p className="text-slate-500 mb-8">System info, port assignments, and registries</p>

      {/* System info card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">System Information</h2>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <InfoItem label="Version" value={data.system.version} />
          <InfoItem label="Node.js" value={data.system.nodeVersion} />
          <InfoItem label="Git Branch" value={data.system.gitBranch} />
          <InfoItem label="Total Products" value={String(data.products.length)} />
          <InfoItem label="Total Agents" value={String(data.agents.length)} />
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 mb-6 bg-slate-900 border border-slate-800 rounded-lg p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'ports' && <PortRegistryTab ports={data.ports} />}
      {activeTab === 'agents' && <AgentRegistryTab agents={data.agents} />}
      {activeTab === 'products' && <ProductRegistryTab products={data.products} phaseVariant={phaseVariant} />}

      {/* Read-only note */}
      <p className="text-xs text-slate-600 mt-6">
        Configuration is managed via repository files. Changes require a commit and redeploy.
      </p>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-sm text-slate-200 font-medium">{value}</p>
    </div>
  );
}

function PortRegistryTab({ ports }: { ports: PortEntry[] }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-800">
            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Product</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Frontend Port</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Backend Port</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {ports.map((port) => (
            <tr key={port.product} className="hover:bg-slate-800/50 transition-colors">
              <td className="px-6 py-4 text-sm text-slate-200 font-medium">{port.product}</td>
              <td className="px-6 py-4 text-sm text-slate-400">
                {port.frontendPort ? (
                  <code className="text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">:{port.frontendPort}</code>
                ) : (
                  <span className="text-slate-600">--</span>
                )}
              </td>
              <td className="px-6 py-4 text-sm text-slate-400">
                {port.backendPort ? (
                  <code className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">:{port.backendPort}</code>
                ) : (
                  <span className="text-slate-600">--</span>
                )}
              </td>
              <td className="px-6 py-4">
                {port.frontendPort || port.backendPort ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Assigned
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                    Unassigned
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {ports.length === 0 && (
        <p className="text-slate-500 text-sm p-6 text-center">No port assignments found</p>
      )}
    </div>
  );
}

function AgentRegistryTab({ agents }: { agents: AgentEntry[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      {agents.map((agent) => (
        <Link
          key={agent.id}
          to={`/agents/${agent.id}`}
          className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white group-hover:text-indigo-400 transition-colors">
              {agent.name}
            </h3>
            <Badge variant={agent.hasExperience ? 'success' : 'default'}>
              {agent.hasExperience ? 'Trained' : 'New'}
            </Badge>
          </div>
        </Link>
      ))}
      {agents.length === 0 && (
        <p className="text-slate-500 text-sm col-span-3">No agents registered</p>
      )}
    </div>
  );
}

function ProductRegistryTab({
  products,
  phaseVariant,
}: {
  products: ProductEntry[];
  phaseVariant: (phase: string) => 'success' | 'info' | 'warning' | 'default';
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-800">
            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Product</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Phase</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {products.map((product) => (
            <tr key={product.name} className="hover:bg-slate-800/50 transition-colors">
              <td className="px-6 py-4">
                <Link
                  to={`/products/${product.name}`}
                  className="text-sm text-slate-200 font-medium hover:text-indigo-400 transition-colors"
                >
                  {product.name}
                </Link>
              </td>
              <td className="px-6 py-4">
                <Badge variant={phaseVariant(product.phase)}>{product.phase}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {products.length === 0 && (
        <p className="text-slate-500 text-sm p-6 text-center">No products registered</p>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-slate-800 rounded w-52 mb-2" />
      <div className="h-4 bg-slate-800 rounded w-72 mb-8" />
      <div className="h-40 bg-slate-800 rounded-xl mb-8" />
      <div className="h-64 bg-slate-800 rounded-xl" />
    </div>
  );
}
