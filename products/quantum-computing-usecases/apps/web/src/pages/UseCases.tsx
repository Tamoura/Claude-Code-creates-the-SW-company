import { useState, useMemo } from 'react';
import { useUseCases } from '../hooks/useUseCases';
import { Industry, ProblemType, MaturityLevel } from '../types';
import FilterPanel from '../components/use-cases/FilterPanel';
import UseCaseCard from '../components/use-cases/UseCaseCard';
import { filterUseCases } from '../utils/filters';

export default function UseCases() {
  const useCases = useUseCases();
  const [selectedIndustries, setSelectedIndustries] = useState<Industry[]>([]);
  const [selectedProblemTypes, setSelectedProblemTypes] = useState<ProblemType[]>([]);
  const [selectedMaturityLevels, setSelectedMaturityLevels] = useState<MaturityLevel[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUseCases = useMemo(() => {
    return filterUseCases(useCases, {
      industries: selectedIndustries,
      problemTypes: selectedProblemTypes,
      maturityLevels: selectedMaturityLevels,
      searchQuery,
    });
  }, [useCases, selectedIndustries, selectedProblemTypes, selectedMaturityLevels, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Quantum Computing Use Cases</h1>
      <p className="text-gray-600 mb-8">
        Browse {useCases.length} practical quantum computing applications across industries
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1">
          <FilterPanel
            selectedIndustries={selectedIndustries}
            selectedProblemTypes={selectedProblemTypes}
            selectedMaturityLevels={selectedMaturityLevels}
            searchQuery={searchQuery}
            onIndustryChange={setSelectedIndustries}
            onProblemTypeChange={setSelectedProblemTypes}
            onMaturityLevelChange={setSelectedMaturityLevels}
            onSearchChange={setSearchQuery}
          />
        </div>

        <div className="lg:col-span-3">
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Showing {filteredUseCases.length} of {useCases.length} use cases
            </p>
          </div>

          {filteredUseCases.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No use cases match your filters. Try adjusting your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredUseCases.map((useCase) => (
                <UseCaseCard key={useCase.id} useCase={useCase} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
