import { Industry, ProblemType, MaturityLevel } from '../../types';
import { formatIndustry, formatProblemType, formatMaturityLevel } from '../../utils/filters';

interface FilterPanelProps {
  selectedIndustries: Industry[];
  selectedProblemTypes: ProblemType[];
  selectedMaturityLevels: MaturityLevel[];
  searchQuery: string;
  onIndustryChange: (industries: Industry[]) => void;
  onProblemTypeChange: (problemTypes: ProblemType[]) => void;
  onMaturityLevelChange: (maturityLevels: MaturityLevel[]) => void;
  onSearchChange: (query: string) => void;
}

const INDUSTRIES: Industry[] = [
  'finance',
  'pharmaceuticals',
  'logistics',
  'materials-science',
  'ai-ml',
  'security',
  'environmental',
  'chemistry',
];

const PROBLEM_TYPES: ProblemType[] = [
  'optimization',
  'simulation',
  'machine-learning',
  'cryptography',
];

const MATURITY_LEVELS: MaturityLevel[] = [
  'theoretical',
  'experimental',
  'pre-production',
  'production-ready',
];

export default function FilterPanel({
  selectedIndustries,
  selectedProblemTypes,
  selectedMaturityLevels,
  searchQuery,
  onIndustryChange,
  onProblemTypeChange,
  onMaturityLevelChange,
  onSearchChange,
}: FilterPanelProps) {
  const toggleIndustry = (industry: Industry) => {
    if (selectedIndustries.includes(industry)) {
      onIndustryChange(selectedIndustries.filter((i) => i !== industry));
    } else {
      onIndustryChange([...selectedIndustries, industry]);
    }
  };

  const toggleProblemType = (problemType: ProblemType) => {
    if (selectedProblemTypes.includes(problemType)) {
      onProblemTypeChange(selectedProblemTypes.filter((p) => p !== problemType));
    } else {
      onProblemTypeChange([...selectedProblemTypes, problemType]);
    }
  };

  const toggleMaturityLevel = (maturityLevel: MaturityLevel) => {
    if (selectedMaturityLevels.includes(maturityLevel)) {
      onMaturityLevelChange(selectedMaturityLevels.filter((m) => m !== maturityLevel));
    } else {
      onMaturityLevelChange([...selectedMaturityLevels, maturityLevel]);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
          Search
        </label>
        <input
          id="search"
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search use cases..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Industry</h3>
        <div className="space-y-2">
          {INDUSTRIES.map((industry) => (
            <label key={industry} className="flex items-center">
              <input
                type="checkbox"
                checked={selectedIndustries.includes(industry)}
                onChange={() => toggleIndustry(industry)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-600">{formatIndustry(industry)}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Problem Type</h3>
        <div className="space-y-2">
          {PROBLEM_TYPES.map((problemType) => (
            <label key={problemType} className="flex items-center">
              <input
                type="checkbox"
                checked={selectedProblemTypes.includes(problemType)}
                onChange={() => toggleProblemType(problemType)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-600">{formatProblemType(problemType)}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">Maturity Level</h3>
        <div className="space-y-2">
          {MATURITY_LEVELS.map((maturityLevel) => (
            <label key={maturityLevel} className="flex items-center">
              <input
                type="checkbox"
                checked={selectedMaturityLevels.includes(maturityLevel)}
                onChange={() => toggleMaturityLevel(maturityLevel)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-600">{formatMaturityLevel(maturityLevel)}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
