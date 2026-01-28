import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUseCases, useUseCasesByIds } from '../hooks/useUseCases';
import UseCaseCard from '../components/use-cases/UseCaseCard';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { getMaturityBadgeVariant, formatMaturityLevel, formatIndustry } from '../utils/filters';

export default function Compare() {
  const [searchParams, setSearchParams] = useSearchParams();
  const useCases = useUseCases();

  const selectedIds = useMemo(() => {
    const ids = searchParams.get('ids');
    return ids ? ids.split(',').filter(Boolean) : [];
  }, [searchParams]);

  const selectedUseCases = useUseCasesByIds(selectedIds);

  const handleSelect = (id: string) => {
    let newIds: string[];
    if (selectedIds.includes(id)) {
      newIds = selectedIds.filter((selectedId) => selectedId !== id);
    } else if (selectedIds.length < 3) {
      newIds = [...selectedIds, id];
    } else {
      return; // Max 3 selections
    }
    setSearchParams({ ids: newIds.join(',') });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Compare Use Cases</h1>
      <p className="text-gray-600 mb-8">
        Select up to 3 use cases to compare side-by-side ({selectedIds.length}/3 selected)
      </p>

      {selectedUseCases.length === 0 ? (
        <div className="mb-12">
          <Card>
            <p className="text-gray-600 text-center py-4">
              Select use cases below to start comparing
            </p>
          </Card>
        </div>
      ) : (
        <div className="mb-12 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-4 font-semibold text-gray-900 border-b border-gray-200">
                  Criteria
                </th>
                {selectedUseCases.map((useCase) => (
                  <th key={useCase.id} className="text-left p-4 font-semibold text-gray-900 border-b border-gray-200">
                    {useCase.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200">
                <td className="p-4 font-medium text-gray-700">Maturity Level</td>
                {selectedUseCases.map((useCase) => (
                  <td key={useCase.id} className="p-4">
                    <Badge variant={getMaturityBadgeVariant(useCase.maturityLevel)}>
                      {formatMaturityLevel(useCase.maturityLevel)}
                    </Badge>
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-200 bg-gray-50">
                <td className="p-4 font-medium text-gray-700">Industries</td>
                {selectedUseCases.map((useCase) => (
                  <td key={useCase.id} className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {useCase.industry.map((ind) => (
                        <Badge key={ind} variant="info">
                          {formatIndustry(ind)}
                        </Badge>
                      ))}
                    </div>
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-200">
                <td className="p-4 font-medium text-gray-700">Qubits Required</td>
                {selectedUseCases.map((useCase) => (
                  <td key={useCase.id} className="p-4 text-gray-900">
                    {useCase.requirements.qubits}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-200 bg-gray-50">
                <td className="p-4 font-medium text-gray-700">Gate Depth</td>
                {selectedUseCases.map((useCase) => (
                  <td key={useCase.id} className="p-4 text-gray-900">
                    {useCase.requirements.gateDepth}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-200">
                <td className="p-4 font-medium text-gray-700">Error Rate</td>
                {selectedUseCases.map((useCase) => (
                  <td key={useCase.id} className="p-4 text-gray-900">
                    {useCase.requirements.errorRate}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-200 bg-gray-50">
                <td className="p-4 font-medium text-gray-700">Current Status</td>
                {selectedUseCases.map((useCase) => (
                  <td key={useCase.id} className="p-4 text-gray-700 text-sm">
                    {useCase.timeline.current}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">All Use Cases</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {useCases.map((useCase) => (
            <UseCaseCard
              key={useCase.id}
              useCase={useCase}
              onSelect={handleSelect}
              selected={selectedIds.includes(useCase.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
