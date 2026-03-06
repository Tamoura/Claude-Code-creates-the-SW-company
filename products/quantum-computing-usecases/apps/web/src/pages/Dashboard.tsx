import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useUseCases } from '../hooks/useUseCases';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { formatMaturityLevel, formatIndustry, formatProblemType, getMaturityBadgeVariant } from '../utils/filters';
import type { MaturityLevel, Industry, ProblemType } from '../types';

export default function Dashboard() {
  const useCases = useUseCases();

  const stats = useMemo(() => {
    const maturityCounts: Record<string, number> = {};
    const industryCounts: Record<string, number> = {};
    const problemTypeCounts: Record<string, number> = {};

    for (const uc of useCases) {
      maturityCounts[uc.maturityLevel] = (maturityCounts[uc.maturityLevel] || 0) + 1;
      for (const ind of uc.industry) {
        industryCounts[ind] = (industryCounts[ind] || 0) + 1;
      }
      problemTypeCounts[uc.problemType] = (problemTypeCounts[uc.problemType] || 0) + 1;
    }

    const avgQubits = Math.round(
      useCases.reduce((sum, uc) => sum + uc.requirements.qubits, 0) / useCases.length
    );

    const nearestToProduction = useCases
      .filter((uc) => uc.maturityLevel === 'pre-production' || uc.maturityLevel === 'production-ready')
      .slice(0, 3);

    return { maturityCounts, industryCounts, problemTypeCounts, avgQubits, nearestToProduction };
  }, [useCases]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
      <p className="text-gray-600 mb-8">
        Overview of quantum computing use cases and key insights
      </p>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <p className="text-sm text-gray-600">Total Use Cases</p>
          <p className="text-3xl font-bold text-gray-900">{useCases.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600">Industries Covered</p>
          <p className="text-3xl font-bold text-gray-900">
            {Object.keys(stats.industryCounts).length}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600">Avg. Qubits Required</p>
          <p className="text-3xl font-bold text-gray-900">{stats.avgQubits}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-600">Near Production</p>
          <p className="text-3xl font-bold text-gray-900">
            {stats.nearestToProduction.length}
          </p>
        </Card>
      </div>

      {/* Maturity Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <Card>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Maturity Distribution</h2>
          <div className="space-y-3">
            {Object.entries(stats.maturityCounts).map(([level, count]) => {
              const percentage = Math.round((count / useCases.length) * 100);
              return (
                <div key={level}>
                  <div className="flex justify-between items-center mb-1">
                    <Badge variant={getMaturityBadgeVariant(level as MaturityLevel)}>
                      {formatMaturityLevel(level as MaturityLevel)}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      {count} ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">By Problem Type</h2>
          <div className="space-y-3">
            {Object.entries(stats.problemTypeCounts).map(([type, count]) => {
              const percentage = Math.round((count / useCases.length) * 100);
              return (
                <div key={type} className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">
                    {formatProblemType(type as ProblemType)}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-500 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-8 text-right">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Industry Coverage */}
      <Card className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Industry Coverage</h2>
        <div className="flex flex-wrap gap-3">
          {Object.entries(stats.industryCounts).map(([industry, count]) => (
            <div key={industry} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
              <Badge variant="info">{formatIndustry(industry as Industry)}</Badge>
              <span className="text-sm font-medium text-gray-700">{count} use cases</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Recommendations */}
      <Card>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recommendations</h2>
        <div className="space-y-4">
          <div className="border-l-4 border-green-500 pl-4">
            <h3 className="font-semibold text-gray-900">Start with Pre-Production Use Cases</h3>
            <p className="text-gray-600 text-sm mt-1">
              {stats.nearestToProduction.length} use cases are approaching production readiness.
              These offer the best near-term ROI for organizations exploring quantum computing.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {stats.nearestToProduction.map((uc) => (
                <Link
                  key={uc.id}
                  to={`/use-cases/${uc.slug}`}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  {uc.title} &rarr;
                </Link>
              ))}
            </div>
          </div>

          <div className="border-l-4 border-blue-500 pl-4">
            <h3 className="font-semibold text-gray-900">Assess Your Readiness</h3>
            <p className="text-gray-600 text-sm mt-1">
              Take our organizational readiness assessment to evaluate your quantum computing preparedness.
            </p>
            <Link
              to="/assessment"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-1 inline-block"
            >
              Start Assessment &rarr;
            </Link>
          </div>

          <div className="border-l-4 border-purple-500 pl-4">
            <h3 className="font-semibold text-gray-900">Prioritize Using the Matrix</h3>
            <p className="text-gray-600 text-sm mt-1">
              Use our priority matrix to visualize use cases by business impact and technical feasibility.
            </p>
            <Link
              to="/priority-matrix"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-1 inline-block"
            >
              View Priority Matrix &rarr;
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
