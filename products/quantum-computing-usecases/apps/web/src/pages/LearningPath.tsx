import { Link } from 'react-router-dom';
import { useUseCases } from '../hooks/useUseCases';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { getMaturityBadgeVariant, formatMaturityLevel } from '../utils/filters';

export default function LearningPath() {
  const useCases = useUseCases();

  // Create a curated learning path: beginner -> intermediate -> advanced
  const learningPath = [
    {
      level: 'Beginner',
      description: 'Start with foundational use cases that are well-understood',
      useCaseIds: ['5', '2', '7'], // Post-quantum crypto, Portfolio optimization, Traffic flow
    },
    {
      level: 'Intermediate',
      description: 'Explore use cases with experimental implementations',
      useCaseIds: ['1', '4', '3'], // Drug discovery, Materials discovery, Supply chain
    },
    {
      level: 'Advanced',
      description: 'Understand cutting-edge theoretical applications',
      useCaseIds: ['6', '8', '10'], // QML, Climate modeling, Protein folding
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Learning Path</h1>
      <p className="text-gray-600 mb-8">
        Follow this curated progression to build your quantum computing knowledge from fundamentals to advanced applications
      </p>

      <div className="space-y-12">
        {learningPath.map((stage, stageIndex) => {
          const stageUseCases = useCases.filter((uc) => stage.useCaseIds.includes(uc.id));

          return (
            <div key={stageIndex}>
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                    {stageIndex + 1}
                  </div>
                  <h2 className="text-2xl font-semibold text-gray-900">{stage.level}</h2>
                </div>
                <p className="text-gray-600 ml-13">{stage.description}</p>
              </div>

              <div className="space-y-4 ml-13">
                {stageUseCases.map((useCase, index) => (
                  <Card key={useCase.id}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-500">
                          Step {stageIndex + 1}.{index + 1}
                        </span>
                        <Badge variant={getMaturityBadgeVariant(useCase.maturityLevel)}>
                          {formatMaturityLevel(useCase.maturityLevel)}
                        </Badge>
                      </div>
                    </div>
                    <Link to={`/use-cases/${useCase.slug}`} className="block group">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 mb-2">
                        {useCase.title}
                      </h3>
                      <p className="text-gray-600 text-sm mb-3">
                        {useCase.shortDescription}
                      </p>
                      <div className="text-blue-600 text-sm font-medium">
                        Learn more →
                      </div>
                    </Link>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Card className="mt-12 bg-blue-50 border-blue-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Why This Order?</h3>
        <p className="text-gray-700 mb-4">
          This learning path is designed to build your understanding progressively:
        </p>
        <ul className="space-y-2 text-gray-700 ml-6 list-disc">
          <li>
            <strong>Beginner:</strong> Start with optimization problems that have clear business value and are approaching production readiness
          </li>
          <li>
            <strong>Intermediate:</strong> Explore simulation use cases that demonstrate quantum advantage but are still experimental
          </li>
          <li>
            <strong>Advanced:</strong> Understand theoretical applications that require fault-tolerant quantum computers
          </li>
        </ul>
      </Card>
    </div>
  );
}
