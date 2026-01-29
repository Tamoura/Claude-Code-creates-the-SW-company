# Quantum Computing Use Cases - Agent Addendum

## Product Overview

**Name**: Quantum Computing Use Cases Platform
**Type**: Web app (static site for prototype)
**Status**: Inception (Prototype)
**Purpose**: Help business analysts and technical leads discover and evaluate practical quantum computing applications relevant to their industry

**Core Value**: Translate complex quantum computing research into actionable business intelligence for decision-makers evaluating quantum technology investments.

## Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Build Tool | Vite 5+ | Lightning-fast dev server, optimized for prototyping |
| Frontend | React 18 + TypeScript 5 | Component reusability, type safety |
| Routing | React Router v6 | Client-side routing, dynamic routes |
| Styling | Tailwind CSS v3 | Utility-first, rapid UI development |
| Data Layer | Static JSON + Zod | No backend, validated with schemas |
| Unit Testing | Vitest + React Testing Library | Jest-compatible, Vite-native |
| E2E Testing | Playwright | Critical path testing only |
| Deployment | Vercel | Zero-config, free tier, automatic CDN |

**Deviation from Company Defaults**: Using Vite instead of Next.js for faster prototyping (sub-second builds vs 5-10s). No backend/database needed for static content validation. See ADR-001 for full rationale.

## Libraries & Dependencies

### Core Dependencies
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^6.21.0",
  "zod": "^3.22.4"
}
```

### Development Dependencies
```json
{
  "vite": "^5.0.0",
  "@vitejs/plugin-react": "^4.2.0",
  "typescript": "^5.3.0",
  "tailwindcss": "^3.4.0",
  "vitest": "^1.1.0",
  "@testing-library/react": "^14.1.0",
  "@testing-library/user-event": "^14.5.0",
  "playwright": "^1.40.0"
}
```

### What to Avoid
- No state management libraries (React Context sufficient for prototype)
- No UI component libraries (build custom with Tailwind for speed)
- No form libraries (simple forms don't need validation overhead)
- No animation libraries (CSS transitions sufficient)

## Design Patterns

### Component Structure
```
src/
├── components/
│   ├── layout/          # Header, Footer, Layout wrapper
│   ├── use-cases/       # UseCaseCard, UseCaseGrid, UseCaseDetail
│   ├── filters/         # FilterPanel, SearchBar, SortDropdown
│   ├── comparison/      # ComparisonTable, ComparisonSelector
│   └── ui/              # Button, Badge, Card (reusable primitives)
├── pages/               # Route components (Home, UseCases, Compare, etc)
├── data/                # JSON seed data
├── hooks/               # Custom hooks (useFilters, useComparison)
├── types/               # TypeScript interfaces and Zod schemas
└── utils/               # Helper functions (search, filter, sort)
```

### State Management
- **URL state**: Filters and comparison selections in query params (shareable links)
- **React Context**: Global state for selected use cases (comparison feature)
- **Local state**: Component-specific UI state (dropdowns, modals)

### Data Flow Pattern
1. Import JSON data at build time (static imports)
2. Validate with Zod schemas on app initialization
3. Pass data through props (no prop drilling - max 2 levels)
4. Use custom hooks for filtering/sorting logic

### Naming Conventions
- Components: PascalCase (UseCaseCard)
- Files: kebab-case (use-case-card.tsx)
- Hooks: camelCase with "use" prefix (useFilters)
- Types: PascalCase with descriptive names (UseCase, MaturityLevel)

## Data Models

### UseCase Schema
```typescript
interface UseCase {
  id: string;                    // Unique identifier
  slug: string;                  // URL-friendly slug
  title: string;                 // Display title
  shortDescription: string;      // One-liner for cards
  fullDescription: string;       // Rich text for detail page
  industry: Industry[];          // Multiple industries possible
  problemType: ProblemType;      // Primary problem category
  maturityLevel: MaturityLevel;  // Current readiness status
  quantumAdvantage: string;      // Why quantum vs classical
  timeline: {
    current: string;             // Current status description
    nearTerm: string;            // 1-3 years outlook
    longTerm: string;            // 5+ years outlook
  };
  requirements: {
    qubits: number;              // Minimum qubit count
    gateDepth: number;           // Circuit depth estimate
    errorRate: number;           // Required error rate threshold
    coherenceTime: string;       // T1/T2 requirements
  };
  examples: {
    company: string;             // Organization name
    description: string;         // What they're doing
    link?: string;               // Optional reference URL
  }[];
  relatedUseCases: string[];     // IDs of related use cases
  lastUpdated: string;           // ISO date string
}

enum Industry {
  Finance = "finance",
  Pharmaceuticals = "pharmaceuticals",
  Logistics = "logistics",
  MaterialsScience = "materials-science",
  AI_ML = "ai-ml",
  Security = "security",
  Environmental = "environmental",
  Chemistry = "chemistry"
}

enum ProblemType {
  Optimization = "optimization",
  Simulation = "simulation",
  MachineLearning = "machine-learning",
  Cryptography = "cryptography"
}

enum MaturityLevel {
  Theoretical = "theoretical",
  Experimental = "experimental",
  PreProduction = "pre-production",
  ProductionReady = "production-ready"
}
```

### Learning Path Schema
```typescript
interface LearningPath {
  id: string;
  title: string;
  description: string;
  steps: {
    useCaseId: string;
    order: number;
    rationale: string;          // Why this use case at this point
    prerequisites: string[];    // Concepts to understand first
  }[];
}
```

## Performance Requirements

### Load Time Targets
- **Initial page load**: < 2 seconds (on 3G connection)
- **Route transitions**: < 100ms
- **Search/filter response**: < 200ms
- **Bundle size**: < 300KB (JS) + < 500KB (CSS/images)

### Optimization Strategies
1. **Code splitting**: Lazy load route components
2. **Image optimization**: Use WebP format, lazy loading with Intersection Observer
3. **Tree shaking**: Vite automatically removes unused code
4. **Compression**: Vercel handles Brotli compression
5. **Caching**: Aggressive caching for static assets (1 year)

### Monitoring (Post-Launch)
- Vercel Analytics for Web Vitals tracking
- No analytics library needed for prototype (keep it lightweight)

## Site Map

| Route | Status | Description |
|-------|--------|-------------|
| / | MVP | Landing page with hero and featured use cases |
| /use-cases | MVP | Directory of all quantum computing use cases with filters |
| /use-cases/[slug] | MVP | Individual use case detail page |
| /compare | MVP | Side-by-side comparison view (up to 3 use cases) |
| /learning-path | MVP | Suggested progression from beginner to advanced use cases |
| /about | Coming Soon | About the platform (placeholder) |

## Business Logic

### Use Case Data Model
Each use case contains:
- **Metadata**: title, slug, industry, problem type, maturity level
- **Content**: description, quantum advantage, timeline, requirements
- **Examples**: real-world companies/projects working on it
- **Resources**: qubit requirements, gate depth, error rates

### Maturity Levels
1. **Theoretical**: Research phase, no working implementations
2. **Experimental**: Lab demonstrations, proof-of-concept
3. **Pre-production**: Advanced testing, limited deployments
4. **Production-ready**: Available quantum computers can run this use case

### Industry Categories
- Finance (trading, risk, portfolio optimization)
- Pharmaceuticals (drug discovery, molecular simulation)
- Logistics (supply chain, routing, scheduling)
- Materials Science (materials discovery, property prediction)
- AI/ML (quantum machine learning, optimization)
- Security (post-quantum cryptography)
- Environmental (climate modeling)
- Chemistry (molecular simulation)

### Filtering Logic
Users can filter by:
- Industry (multi-select)
- Problem type (optimization, simulation, ML, cryptography)
- Maturity level (multi-select)
- Technical requirements (qubit count ranges)

### Comparison Logic
- Select up to 3 use cases for side-by-side comparison
- Compare: maturity, requirements, industry, business impact, complexity
- Comparison state persists in URL query params (shareable)

## Key Features (Prototype Scope)

### 1. Use Case Directory
- Grid or list view of all use cases
- Filter panel (industry, problem type, maturity)
- Search functionality (title and description)
- Sort options (maturity, alphabetical, impact)

### 2. Use Case Detail Pages
- Rich content pages with:
  - Problem description (plain language)
  - Quantum advantage explanation
  - Maturity status and timeline
  - Technical requirements
  - Real-world examples
  - Related use cases

### 3. Comparison View
- Select use cases to compare
- Side-by-side table view
- Key metrics highlighted
- Export or share comparison

### 4. Learning Path
- Curated progression of use cases
- Beginner → Intermediate → Advanced
- Helps users build quantum computing literacy
- Each step explains prerequisites

### 5. Responsive Design
- Mobile-friendly layout
- Touch-friendly filters and navigation
- Optimized for both research (desktop) and quick reference (mobile)

## Special Considerations

### Content Strategy
- **Plain language first**: Avoid quantum physics jargon unless necessary
- **Business focus**: Emphasize "why this matters" over "how it works"
- **Honest maturity assessment**: Don't oversell theoretical use cases
- **Regular updates**: Quantum computing field evolves rapidly

### Performance Requirements
- Initial page load: < 2 seconds
- Use case search/filter: < 200ms response time
- Image optimization: WebP format, lazy loading
- Bundle size: < 300KB (without images)

### Prototype Constraints
- **No user authentication**: All content publicly accessible
- **No backend API**: All data in JSON files during prototype
- **Limited content**: 8-10 use cases for initial validation
- **Static deployment**: No server-side logic for prototype

### SEO Considerations
- Semantic HTML and proper heading hierarchy
- Meta tags for each use case page
- Open Graph tags for social sharing
- Sitemap generation for search engines

---

*Created by*: Product Manager
*Tech Stack & Architecture by*: Architect
*Last Updated*: 2026-01-27
*Status*: Architecture complete - ready for implementation
