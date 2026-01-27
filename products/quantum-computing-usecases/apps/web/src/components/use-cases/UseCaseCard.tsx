import { Link } from 'react-router-dom';
import { UseCase } from '../../types';
import Badge from '../ui/Badge';
import Card from '../ui/Card';
import { getMaturityBadgeVariant, formatMaturityLevel, formatIndustry } from '../../utils/filters';

interface UseCaseCardProps {
  useCase: UseCase;
  onSelect?: (id: string) => void;
  selected?: boolean;
}

export default function UseCaseCard({ useCase, onSelect, selected }: UseCaseCardProps) {
  return (
    <Card className={`hover:shadow-md transition-shadow ${selected ? 'ring-2 ring-blue-500' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <Badge variant={getMaturityBadgeVariant(useCase.maturityLevel)}>
          {formatMaturityLevel(useCase.maturityLevel)}
        </Badge>
        {onSelect && (
          <button
            onClick={() => onSelect(useCase.id)}
            className={`text-sm font-medium ${
              selected ? 'text-blue-600' : 'text-gray-500 hover:text-blue-600'
            }`}
            aria-label={selected ? 'Deselect use case' : 'Select use case'}
          >
            {selected ? 'Selected' : 'Select'}
          </button>
        )}
      </div>
      <Link to={`/use-cases/${useCase.slug}`} className="block group">
        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 mb-2">
          {useCase.title}
        </h3>
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {useCase.shortDescription}
        </p>
        <div className="flex flex-wrap gap-2">
          {useCase.industry.slice(0, 2).map((industry) => (
            <Badge key={industry} variant="info">
              {formatIndustry(industry)}
            </Badge>
          ))}
          {useCase.industry.length > 2 && (
            <Badge variant="default">+{useCase.industry.length - 2}</Badge>
          )}
        </div>
      </Link>
    </Card>
  );
}
