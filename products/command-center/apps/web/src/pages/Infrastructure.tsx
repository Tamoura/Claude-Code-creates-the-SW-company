import { useApi } from '../hooks/useApi.js';
import StatCard from '../components/StatCard.js';

interface PortAssignment {
  product: string;
  frontendPort: number | null;
  backendPort: number | null;
}

interface CiPipeline {
  name: string;
  product: string;
  filename: string;
}

interface InfraData {
  ports: PortAssignment[];
  pipelines: CiPipeline[];
  totalFrontendPorts: number;
  totalBackendPorts: number;
  availableFrontendPorts: number;
  availableBackendPorts: number;
}

export default function Infrastructure() {
  const { data, loading } = useApi<InfraData>('/infrastructure');

  if (loading) return <div className="animate-pulse"><div className="h-8 bg-gray-800 rounded w-40 mb-6" /></div>;
  if (!data) return <p className="text-red-400">Failed to load infrastructure</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Infrastructure</h1>
      <p className="text-gray-500 mb-8">Ports, CI/CD pipelines, and services</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Frontend Ports" value={data.totalFrontendPorts} sublabel={`${data.availableFrontendPorts} available`} color="blue" />
        <StatCard label="Backend Ports" value={data.totalBackendPorts} sublabel={`${data.availableBackendPorts} available`} color="green" />
        <StatCard label="CI Pipelines" value={data.pipelines.length} color="purple" />
        <StatCard label="Port Range" value="3100-5099" sublabel="Frontend + Backend" color="orange" />
      </div>

      {/* Port Map */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Port Assignments</h2>
        {data.ports.length === 0 ? (
          <p className="text-gray-500 text-sm">No port assignments found in registry</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.ports.map((p) => (
              <div key={p.product} className="bg-gray-800/50 rounded-lg p-3 flex items-center justify-between">
                <span className="text-sm text-gray-300 font-medium">{p.product}</span>
                <div className="flex gap-3 text-xs">
                  {p.frontendPort && (
                    <span className="text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">:{p.frontendPort}</span>
                  )}
                  {p.backendPort && (
                    <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">:{p.backendPort}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CI Pipelines */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">CI/CD Pipelines</h2>
        {data.pipelines.length === 0 ? (
          <p className="text-gray-500 text-sm">No CI pipelines found</p>
        ) : (
          <div className="space-y-2">
            {data.pipelines.map((p) => (
              <div key={p.filename} className="flex items-center gap-3 bg-gray-800/50 rounded-lg p-3">
                <svg className="w-5 h-5 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0015 0m-15 0a7.5 7.5 0 1115 0m-15 0H3m16.5 0H21m-1.5 0H12m-8.457 3.077l1.41-.513m14.095-5.13l1.41-.513M5.106 17.785l1.15-.964m11.49-9.642l1.149-.964M7.501 19.795l.75-1.3m7.5-12.99l.75-1.3m-6.063 16.658l.26-1.477m2.605-14.772l.26-1.477m0 17.726l-.26-1.477M10.698 4.614l-.26-1.477M16.5 19.794l-.75-1.299M7.5 4.205L12 12m6.894 5.785l-1.149-.964M6.256 7.178l-1.15-.964m15.352 8.864l-1.41-.513M4.954 9.435l-1.41-.514M12.002 12l-3.75 6.495" />
                </svg>
                <div>
                  <p className="text-sm text-gray-300">{p.filename}</p>
                  <p className="text-xs text-gray-600">{p.product}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
