import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useUseCases } from '../hooks/useUseCases';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { getMaturityBadgeVariant, formatMaturityLevel } from '../utils/filters';
import type { UseCase, MaturityLevel } from '../types';

/**
 * Map use cases into a 2D space:
 * X-axis: Feasibility (based on maturity + lower qubit requirements)
 * Y-axis: Business Impact (based on industry breadth + examples count)
 */
function getPosition(uc: UseCase): { x: number; y: number } {
  // Feasibility (0-100): higher maturity + lower requirements = more feasible
  const maturityScore: Record<MaturityLevel, number> = {
    'production-ready': 90,
    'pre-production': 70,
    'experimental': 45,
    'theoretical': 20,
  };
  const qubitPenalty = Math.min(uc.requirements.qubits / 10, 30);
  const feasibility = Math.max(5, Math.min(95, maturityScore[uc.maturityLevel] - qubitPenalty));

  // Impact (0-100): more industries + examples + lower error tolerance = higher impact
  const industryScore = uc.industry.length * 15;
  const exampleScore = uc.examples.length * 10;
  const baseImpact = 30 + industryScore + exampleScore;
  const impact = Math.max(5, Math.min(95, baseImpact));

  return { x: feasibility, y: impact };
}

const quadrantColors = {
  'Quick Wins': 'bg-green-50 border-green-200',
  'Strategic Bets': 'bg-blue-50 border-blue-200',
  'Monitor': 'bg-yellow-50 border-yellow-200',
  'Deprioritize': 'bg-gray-50 border-gray-200',
};

export default function PriorityMatrix() {
  const useCases = useUseCases();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const positioned = useMemo(() => {
    return useCases.map((uc) => ({ ...uc, pos: getPosition(uc) }));
  }, [useCases]);

  const getQuadrant = (x: number, y: number) => {
    if (x >= 50 && y >= 50) return 'Quick Wins';
    if (x < 50 && y >= 50) return 'Strategic Bets';
    if (x >= 50 && y < 50) return 'Monitor';
    return 'Deprioritize';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Priority Matrix</h1>
      <p className="text-gray-600 mb-8">
        Visualize quantum computing use cases by business impact and technical feasibility
        to prioritize your organization&apos;s investments
      </p>

      {/* Matrix */}
      <Card className="mb-8">
        <div className="relative" style={{ paddingBottom: '60%' }}>
          <div className="absolute inset-0">
            {/* Axis labels */}
            <div className="absolute left-1/2 bottom-0 -translate-x-1/2 text-sm font-semibold text-gray-600 pb-1">
              Feasibility &rarr;
            </div>
            <div
              className="absolute left-0 top-1/2 text-sm font-semibold text-gray-600"
              style={{ transform: 'rotate(-90deg) translateX(-50%)', transformOrigin: 'left top' }}
            >
              Business Impact &rarr;
            </div>

            {/* Quadrant backgrounds */}
            <div className="absolute inset-8">
              {/* Grid lines */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-300" />
              <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-300" />

              {/* Quadrant labels */}
              <div className="absolute top-2 left-2 text-xs font-semibold text-blue-600 opacity-70">
                Strategic Bets
              </div>
              <div className="absolute top-2 right-2 text-xs font-semibold text-green-600 opacity-70">
                Quick Wins
              </div>
              <div className="absolute bottom-2 left-2 text-xs font-semibold text-gray-500 opacity-70">
                Deprioritize
              </div>
              <div className="absolute bottom-2 right-2 text-xs font-semibold text-yellow-600 opacity-70">
                Monitor
              </div>

              {/* Use case dots */}
              {positioned.map((uc) => (
                <div
                  key={uc.id}
                  data-testid="matrix-dot"
                  className="absolute w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow cursor-pointer hover:w-5 hover:h-5 transition-all z-10"
                  style={{
                    left: `${uc.pos.x}%`,
                    bottom: `${uc.pos.y}%`,
                    transform: 'translate(-50%, 50%)',
                  }}
                  onMouseEnter={() => setHoveredId(uc.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  title={uc.title}
                >
                  {hoveredId === uc.id && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-20">
                      {uc.title}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Use case list grouped by quadrant */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(['Quick Wins', 'Strategic Bets', 'Monitor', 'Deprioritize'] as const).map((quadrant) => {
          const items = positioned.filter(
            (uc) => getQuadrant(uc.pos.x, uc.pos.y) === quadrant
          );
          if (items.length === 0) return null;

          return (
            <Card key={quadrant} className={quadrantColors[quadrant]}>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">{quadrant}</h2>
              <div className="space-y-3">
                {items.map((uc) => (
                  <div key={uc.id} className="flex items-start justify-between">
                    <div>
                      <Link
                        to={`/use-cases/${uc.slug}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        {uc.title}
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={getMaturityBadgeVariant(uc.maturityLevel)}>
                          {formatMaturityLevel(uc.maturityLevel)}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {uc.requirements.qubits} qubits
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
