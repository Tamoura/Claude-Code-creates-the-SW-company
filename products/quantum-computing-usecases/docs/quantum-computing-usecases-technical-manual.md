# Quantum Computing Use Cases - Technical Manual

**Version**: 1.0
**Last Updated**: 2026-01-28
**Product**: Quantum Computing Use Cases Platform

---

## Architecture Overview

The Quantum Computing Use Cases platform is a **static single-page application** with no backend. All data is embedded at build time.

### System Architecture

```
┌────────────────────────────────────────┐
│            Browser                      │
│  ┌──────────────────────────────────┐ │
│  │   React 18 Application           │ │
│  │   - Vite build tool              │ │
│  │   - React Router v6              │ │
│  │   - TypeScript 5                 │ │
│  └──────────────────────────────────┘ │
│                 │                      │
│                 ▼                      │
│  ┌──────────────────────────────────┐ │
│  │   Static JSON Data               │ │
│  │   - 10 use cases                 │ │
│  │   - Industry mappings            │ │
│  │   - Related use cases            │ │
│  └──────────────────────────────────┘ │
└────────────────────────────────────────┘
          │
          │ HTTPS
          ▼
┌────────────────────────────────────────┐
│    Static Hosting (Vercel)             │
└────────────────────────────────────────┘
```

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Build Tool | Vite 5 | Lightning-fast development |
| Framework | React 18 | Component-based UI |
| Language | TypeScript 5 | Type safety |
| Routing | React Router v6 | Client-side routing |
| Styling | Tailwind CSS 3 | Utility-first styling |
| Validation | Zod | Runtime type validation |
| Testing | Vitest | Unit testing |
| E2E Testing | React Testing Library | Component testing |

---

## Data Model

### Use Case Structure

```typescript
// types/useCase.ts

interface UseCase {
  id: string;
  slug: string; // URL-friendly
  title: string;
  shortDescription: string;
  fullDescription: string;
  
  // Classification
  industry: Industry[];
  problemType: ProblemType;
  maturityLevel: MaturityLevel;
  
  // Technical Details
  quantumAdvantage: string;
  timeline: {
    current: string;
    nearTerm: string;
    longTerm: string;
  };
  requirements: {
    qubits: string;
    gateDepth: string;
    errorRate: string;
    coherenceTime: string;
  };
  
  // Examples and References
  examples: {
    company: string;
    project: string;
    description: string;
  }[];
  relatedUseCases: string[]; // IDs
}

type Industry = 
  | 'finance' 
  | 'pharmaceuticals' 
  | 'logistics' 
  | 'materials-science'
  | 'security' 
  | 'ai-ml' 
  | 'environmental'
  | 'chemistry';

type ProblemType = 
  | 'optimization' 
  | 'simulation' 
  | 'machine-learning' 
  | 'cryptography';

type MaturityLevel = 
  | 'theoretical' 
  | 'experimental' 
  | 'pre-production' 
  | 'production-ready';
```

### Data Storage

```
src/data/
├── use-cases.json          # Main data file
├── industries.ts           # Industry metadata
├── problemTypes.ts         # Problem type definitions
└── maturityLevels.ts       # Maturity level descriptions
```

---

## Component Architecture

### Component Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── Layout.tsx
│   ├── use-cases/
│   │   ├── UseCaseCard.tsx       # Grid view card
│   │   ├── UseCaseList.tsx       # List view row
│   │   ├── UseCaseDetail.tsx     # Full detail page
│   │   ├── FilterPanel.tsx       # Sidebar filters
│   │   └── SearchBar.tsx         # Search input
│   ├── compare/
│   │   ├── ComparisonTable.tsx   # Side-by-side comparison
│   │   └── UseCaseSelector.tsx   # Dropdown to select use cases
│   └── ui/
│       ├── Badge.tsx             # Reusable badge component
│       └── Card.tsx              # Reusable card component
│
├── pages/
│   ├── Home.tsx                  # Landing page
│   ├── UseCases.tsx              # Directory with filtering
│   ├── UseCaseDetail.tsx         # Individual use case
│   ├── Compare.tsx               # Comparison tool
│   └── LearningPath.tsx          # Curated progression
│
├── hooks/
│   ├── useUseCases.ts            # Custom hook for data
│   └── useFilters.ts             # Filter state management
│
├── utils/
│   └── filters.ts                # Filter logic
│
├── types/
│   └── index.ts                  # TypeScript types
│
└── data/
    └── use-cases.json            # Use case data
```

---

## Routing

### Routes

```typescript
// App.tsx
<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/use-cases" element={<UseCases />} />
  <Route path="/use-cases/:slug" element={<UseCaseDetail />} />
  <Route path="/compare" element={<Compare />} />
  <Route path="/learning-path" element={<LearningPath />} />
</Routes>
```

**Route Parameters:**
- `/` - Landing page with featured use cases
- `/use-cases` - Full directory with filters and search
- `/use-cases/:slug` - Detail page (e.g., `/use-cases/drug-discovery`)
- `/compare` - Comparison tool
- `/learning-path` - Curated learning progression

---

## Filtering Logic

### Filter Implementation

```typescript
// utils/filters.ts

export function filterUseCases(
  useCases: UseCase[],
  filters: Filters
): UseCase[] {
  return useCases.filter(useCase => {
    // Industry filter
    if (filters.industries.length > 0) {
      if (!filters.industries.some(ind => useCase.industry.includes(ind))) {
        return false;
      }
    }
    
    // Problem type filter
    if (filters.problemTypes.length > 0) {
      if (!filters.problemTypes.includes(useCase.problemType)) {
        return false;
      }
    }
    
    // Maturity level filter
    if (filters.maturityLevels.length > 0) {
      if (!filters.maturityLevels.includes(useCase.maturityLevel)) {
        return false;
      }
    }
    
    // Search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const searchableText = [
        useCase.title,
        useCase.shortDescription,
        useCase.fullDescription,
        ...useCase.industry,
        useCase.problemType
      ].join(' ').toLowerCase();
      
      if (!searchableText.includes(query)) {
        return false;
      }
    }
    
    return true;
  });
}
```

---

## State Management

### Filter State (React Context)

```typescript
// hooks/useFilters.ts

interface Filters {
  industries: Industry[];
  problemTypes: ProblemType[];
  maturityLevels: MaturityLevel[];
  searchQuery: string;
}

export function useFilters() {
  const [filters, setFilters] = useState<Filters>({
    industries: [],
    problemTypes: [],
    maturityLevels: [],
    searchQuery: ''
  });
  
  const updateFilter = (key: keyof Filters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  
  const clearFilters = () => {
    setFilters({
      industries: [],
      problemTypes: [],
      maturityLevels: [],
      searchQuery: ''
    });
  };
  
  return { filters, updateFilter, clearFilters };
}
```

---

## Testing

### Unit Tests

```typescript
// utils/filters.test.ts
import { describe, it, expect } from 'vitest';
import { filterUseCases } from './filters';

describe('filterUseCases', () => {
  it('filters by industry', () => {
    const useCases = [
      { industry: ['finance'], ... },
      { industry: ['pharmaceuticals'], ... }
    ];
    
    const result = filterUseCases(useCases, {
      industries: ['finance'],
      problemTypes: [],
      maturityLevels: [],
      searchQuery: ''
    });
    
    expect(result).toHaveLength(1);
    expect(result[0].industry).toContain('finance');
  });
});
```

### Component Tests

```typescript
// components/use-cases/UseCaseCard.test.tsx
import { render, screen } from '@testing-library/react';
import { UseCaseCard } from './UseCaseCard';

it('renders use case card with title and description', () => {
  const useCase = {
    id: '1',
    slug: 'test',
    title: 'Test Use Case',
    shortDescription: 'Test description',
    ...
  };
  
  render(<UseCaseCard useCase={useCase} />);
  
  expect(screen.getByText('Test Use Case')).toBeInTheDocument();
  expect(screen.getByText('Test description')).toBeInTheDocument();
});
```

---

## Deployment

### Build Process

```bash
# Build for production
npm run build

# Output: dist/
# - index.html
# - assets/
#   - index-[hash].js (~150KB gzipped)
#   - index-[hash].css (~15KB gzipped)
```

### Vercel Deployment

```bash
# Deploy to Vercel
vercel --prod

# Automatic deployments from GitHub main branch
```

### Performance Targets

- **Bundle Size**: < 200KB gzipped
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 2.5s
- **Lighthouse Score**: 95+

---

## Development Workflow

### Setup

```bash
git clone https://github.com/connectsw/quantum-usecases.git
cd quantum-usecases/apps/web
npm install
npm run dev
# Open http://localhost:3100
```

### Adding a New Use Case

1. **Create Use Case Data**
   ```json
   // src/data/use-cases.json
   {
     "id": "new-use-case",
     "slug": "new-use-case",
     "title": "New Quantum Use Case",
     "shortDescription": "...",
     "fullDescription": "...",
     "industry": ["finance"],
     "problemType": "optimization",
     "maturityLevel": "experimental",
     ...
   }
   ```

2. **Validate Schema**
   ```bash
   npm run validate-data
   ```

3. **Test**
   ```bash
   npm test
   ```

4. **Build and Preview**
   ```bash
   npm run build
   npm run preview
   ```

---

## Future Enhancements

### Phase 2 Features

When adding backend:
1. **User Accounts**: Save favorites, track reading progress
2. **Comments**: Community discussions per use case
3. **Ratings**: User ratings and reviews
4. **Dynamic Content**: CMS for easy updates
5. **Analytics**: Track popular use cases, search terms
6. **API**: REST API for programmatic access

### Migration Path

To add backend:
1. Add Next.js API routes in `app/api/`
2. Add database (PostgreSQL + Prisma)
3. Add authentication (NextAuth.js)
4. Convert static JSON to database queries
5. Add admin panel for content management

Component structure remains largely unchanged.

---

**End of Technical Manual**
