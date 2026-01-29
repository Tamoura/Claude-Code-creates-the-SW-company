import { UseCase, Industry, ProblemType, MaturityLevel } from '../types';

export interface FilterOptions {
  industries: Industry[];
  problemTypes: ProblemType[];
  maturityLevels: MaturityLevel[];
  searchQuery: string;
}

export function filterUseCases(useCases: UseCase[], filters: FilterOptions): UseCase[] {
  return useCases.filter((useCase) => {
    // Industry filter
    if (filters.industries.length > 0) {
      const hasMatchingIndustry = useCase.industry.some((ind) =>
        filters.industries.includes(ind)
      );
      if (!hasMatchingIndustry) return false;
    }

    // Problem type filter
    if (filters.problemTypes.length > 0) {
      if (!filters.problemTypes.includes(useCase.problemType)) return false;
    }

    // Maturity level filter
    if (filters.maturityLevels.length > 0) {
      if (!filters.maturityLevels.includes(useCase.maturityLevel)) return false;
    }

    // Search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const matchesTitle = useCase.title.toLowerCase().includes(query);
      const matchesDescription = useCase.shortDescription.toLowerCase().includes(query);
      const matchesFullDescription = useCase.fullDescription.toLowerCase().includes(query);

      if (!matchesTitle && !matchesDescription && !matchesFullDescription) return false;
    }

    return true;
  });
}

export function getMaturityBadgeVariant(maturity: MaturityLevel): 'default' | 'info' | 'warning' | 'success' {
  switch (maturity) {
    case 'theoretical':
      return 'default';
    case 'experimental':
      return 'info';
    case 'pre-production':
      return 'warning';
    case 'production-ready':
      return 'success';
    default:
      return 'default';
  }
}

export function formatMaturityLevel(maturity: MaturityLevel): string {
  const labels: Record<MaturityLevel, string> = {
    'theoretical': 'Theoretical',
    'experimental': 'Experimental',
    'pre-production': 'Pre-Production',
    'production-ready': 'Production Ready',
  };
  return labels[maturity];
}

export function formatIndustry(industry: Industry): string {
  const labels: Record<Industry, string> = {
    'finance': 'Finance',
    'pharmaceuticals': 'Pharmaceuticals',
    'logistics': 'Logistics',
    'materials-science': 'Materials Science',
    'ai-ml': 'AI/ML',
    'security': 'Security',
    'environmental': 'Environmental',
    'chemistry': 'Chemistry',
  };
  return labels[industry];
}

export function formatProblemType(problemType: ProblemType): string {
  const labels: Record<ProblemType, string> = {
    'optimization': 'Optimization',
    'simulation': 'Simulation',
    'machine-learning': 'Machine Learning',
    'cryptography': 'Cryptography',
  };
  return labels[problemType];
}
