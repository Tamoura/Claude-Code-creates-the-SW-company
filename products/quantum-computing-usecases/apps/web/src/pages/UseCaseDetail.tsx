import { useParams, Link } from 'react-router-dom';
import { useUseCaseBySlug, useUseCasesByIds } from '../hooks/useUseCases';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import UseCaseCard from '../components/use-cases/UseCaseCard';
import { getMaturityBadgeVariant, formatMaturityLevel, formatIndustry, formatProblemType } from '../utils/filters';

export default function UseCaseDetail() {
  const { slug } = useParams<{ slug: string }>();
  const useCase = useUseCaseBySlug(slug || '');
  const relatedUseCases = useUseCasesByIds(useCase?.relatedUseCases || []);

  if (!useCase) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Use Case Not Found</h1>
        <Link to="/use-cases" className="text-blue-600 hover:text-blue-700">
          Browse all use cases
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/use-cases" className="text-blue-600 hover:text-blue-700 mb-4 inline-block">
        ← Back to all use cases
      </Link>

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Badge variant={getMaturityBadgeVariant(useCase.maturityLevel)}>
            {formatMaturityLevel(useCase.maturityLevel)}
          </Badge>
          <Badge variant="info">{formatProblemType(useCase.problemType)}</Badge>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">{useCase.title}</h1>
        <p className="text-xl text-gray-600">{useCase.shortDescription}</p>
      </div>

      <Card className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Overview</h2>
        <p className="text-gray-700 mb-4">{useCase.fullDescription}</p>

        <h3 className="text-lg font-semibold text-gray-900 mb-2">Industries</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {useCase.industry.map((industry) => (
            <Badge key={industry} variant="info">
              {formatIndustry(industry)}
            </Badge>
          ))}
        </div>
      </Card>

      <Card className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Quantum Advantage</h2>
        <p className="text-gray-700">{useCase.quantumAdvantage}</p>
      </Card>

      <Card className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Timeline & Maturity</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Current Status</h3>
            <p className="text-gray-700">{useCase.timeline.current}</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Near-Term (1-3 years)</h3>
            <p className="text-gray-700">{useCase.timeline.nearTerm}</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Long-Term (5+ years)</h3>
            <p className="text-gray-700">{useCase.timeline.longTerm}</p>
          </div>
        </div>
      </Card>

      <Card className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Technical Requirements</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Qubits</p>
            <p className="text-lg font-semibold text-gray-900">{useCase.requirements.qubits}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Gate Depth</p>
            <p className="text-lg font-semibold text-gray-900">{useCase.requirements.gateDepth}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Error Rate</p>
            <p className="text-lg font-semibold text-gray-900">{useCase.requirements.errorRate}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Coherence Time</p>
            <p className="text-lg font-semibold text-gray-900">{useCase.requirements.coherenceTime}</p>
          </div>
        </div>
      </Card>

      {useCase.examples.length > 0 && (
        <Card className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Real-World Examples</h2>
          <div className="space-y-4">
            {useCase.examples.map((example, index) => (
              <div key={index}>
                <h3 className="font-semibold text-gray-900">{example.company}</h3>
                <p className="text-gray-700">{example.description}</p>
                {example.link && (
                  <a
                    href={example.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 text-sm"
                  >
                    Learn more →
                  </a>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {relatedUseCases.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Related Use Cases</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {relatedUseCases.map((relatedUseCase) => (
              <UseCaseCard key={relatedUseCase.id} useCase={relatedUseCase} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
