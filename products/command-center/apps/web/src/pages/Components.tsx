import { useApi } from '../hooks/useApi.js';
import StatCard from '../components/StatCard.js';

interface SharedPackage {
  name: string;
  location: string;
  description: string;
  fileCount: number;
  hasBackend: boolean;
  hasFrontend: boolean;
  hasPrisma: boolean;
}

interface ComponentStats {
  totalPackages: number;
  totalComponents: number;
  packages: SharedPackage[];
}

export default function Components() {
  const { data, loading } = useApi<ComponentStats>('/components');

  if (loading) return <div className="animate-pulse"><div className="h-8 bg-gray-800 rounded w-32 mb-6" /></div>;
  if (!data) return <p className="text-red-400">Failed to load components</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Component Library</h1>
      <p className="text-gray-500 mb-8">Shared @connectsw/* packages</p>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard label="Packages" value={data.totalPackages} color="purple" />
        <StatCard label="Total Files" value={data.totalComponents} color="blue" />
        <StatCard label="With Prisma" value={data.packages.filter((p) => p.hasPrisma).length} sublabel="Database models" color="green" />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Package</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Backend</th>
              <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Frontend</th>
              <th className="text-center px-6 py-3 text-xs font-medium text-gray-500 uppercase">Prisma</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">Files</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {data.packages.map((pkg) => (
              <tr key={pkg.name} className="hover:bg-gray-800/50 transition-colors">
                <td className="px-6 py-4">
                  <code className="text-sm text-blue-400">{pkg.name}</code>
                  <p className="text-xs text-gray-600 mt-0.5">{pkg.location}</p>
                </td>
                <td className="px-6 py-4 text-sm text-gray-400">{pkg.description}</td>
                <td className="px-6 py-4 text-center">{pkg.hasBackend ? <Check /> : <Dash />}</td>
                <td className="px-6 py-4 text-center">{pkg.hasFrontend ? <Check /> : <Dash />}</td>
                <td className="px-6 py-4 text-center">{pkg.hasPrisma ? <Check /> : <Dash />}</td>
                <td className="px-6 py-4 text-right text-sm text-gray-400">{pkg.fileCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Check() {
  return <span className="text-emerald-400">&#10003;</span>;
}

function Dash() {
  return <span className="text-gray-700">&mdash;</span>;
}
