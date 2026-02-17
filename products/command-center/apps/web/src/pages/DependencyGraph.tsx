import { useApi } from '../hooks/useApi.js';
import StatCard from '../components/StatCard.js';
import Badge from '../components/Badge.js';
import MarkdownRenderer from '../components/MarkdownRenderer.js';

interface GraphNode {
  id: string;
  type: 'product' | 'package' | 'agent';
  label: string;
  group: string;
}

interface GraphEdge {
  source: string;
  target: string;
  label?: string;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

function buildMermaid(nodes: GraphNode[], edges: GraphEdge[]): string {
  const lines: string[] = ['graph LR'];

  for (const node of nodes) {
    const safeId = node.id.replace(/[^a-zA-Z0-9_]/g, '_');
    const safeLabel = node.label.replace(/"/g, "'");
    if (node.type === 'product') {
      lines.push(`  ${safeId}("${safeLabel}"):::product`);
    } else if (node.type === 'package') {
      lines.push(`  ${safeId}["${safeLabel}"]:::package`);
    } else {
      lines.push(`  ${safeId}(("${safeLabel}")):::agent`);
    }
  }

  for (const edge of edges) {
    const src = edge.source.replace(/[^a-zA-Z0-9_]/g, '_');
    const tgt = edge.target.replace(/[^a-zA-Z0-9_]/g, '_');
    if (edge.label) {
      lines.push(`  ${src} -->|${edge.label}| ${tgt}`);
    } else {
      lines.push(`  ${src} --> ${tgt}`);
    }
  }

  lines.push('  classDef product fill:#1e40af,stroke:#3b82f6,color:#fff');
  lines.push('  classDef package fill:#065f46,stroke:#10b981,color:#fff');
  lines.push('  classDef agent fill:#6b21a8,stroke:#a855f7,color:#fff');

  return lines.join('\n');
}

function countConnections(nodeId: string, edges: GraphEdge[]): number {
  return edges.filter((e) => e.source === nodeId || e.target === nodeId).length;
}

const typeVariant = (type: string): 'info' | 'success' | 'default' => {
  if (type === 'product') return 'info';
  if (type === 'package') return 'success';
  return 'default';
};

export default function DependencyGraph() {
  const { data, loading } = useApi<GraphData>('/dependency-graph');

  if (loading) return <LoadingSkeleton />;
  if (!data) return <p className="text-red-400">Failed to load dependency graph</p>;

  const { nodes, edges } = data;
  const products = nodes.filter((n) => n.type === 'product');
  const packages = nodes.filter((n) => n.type === 'package');
  const mermaidCode = buildMermaid(nodes, edges);
  const markdown = '```mermaid\n' + mermaidCode + '\n```';

  const sortedNodes = [...nodes].sort((a, b) => {
    const ac = countConnections(a.id, edges);
    const bc = countConnections(b.id, edges);
    return bc - ac;
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Dependency Graph</h1>
      <p className="text-gray-500 mb-8">Visualize relationships between products, packages, and agents</p>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Products" value={products.length} color="blue" />
        <StatCard label="Packages" value={packages.length} color="green" />
        <StatCard label="Connections" value={edges.length} color="purple" />
      </div>

      {/* Mermaid Graph */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Graph Visualization</h2>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-blue-600" />
            <span className="text-xs text-gray-400">Product</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-emerald-600" />
            <span className="text-xs text-gray-400">Package</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-purple-600" />
            <span className="text-xs text-gray-400">Agent</span>
          </div>
        </div>
        <MarkdownRenderer content={markdown} />
      </div>

      {/* Node List Table */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Node List</h2>
        {sortedNodes.length === 0 ? (
          <p className="text-gray-500 text-sm">No nodes found</p>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Group</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Connections</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {sortedNodes.map((node) => (
                  <tr key={node.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <Badge variant={typeVariant(node.type)}>{node.type}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">{node.label}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{node.group}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">{countConnections(node.id, edges)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-800 rounded w-52 mb-2" />
      <div className="h-4 bg-gray-800 rounded w-80 mb-8" />
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-gray-800 rounded-xl" />)}
      </div>
      <div className="h-64 bg-gray-800 rounded-xl" />
    </div>
  );
}
