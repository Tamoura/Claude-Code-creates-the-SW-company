# Quantum Computing Use Cases - Web App

A prototype web application for discovering and exploring practical quantum computing applications across industries.

## Features

1. **Use Case Directory** - Browse 10 quantum computing use cases with filtering by industry, problem type, and maturity level
2. **Detail Pages** - Comprehensive information about each use case including quantum advantage, timeline, requirements, and real-world examples
3. **Filtering & Search** - Filter by industry, problem type, maturity level, and search by keywords
4. **Comparative View** - Compare up to 3 use cases side-by-side to evaluate requirements and maturity
5. **Learning Path** - Curated progression from beginner to advanced quantum computing concepts

## Tech Stack

- **Vite 5** - Lightning-fast build tool
- **React 18** - UI framework
- **TypeScript 5** - Type safety
- **React Router v6** - Client-side routing
- **Tailwind CSS v3** - Utility-first styling
- **Zod** - Runtime data validation
- **Vitest** - Unit testing
- **React Testing Library** - Component testing

## Quick Start

### Install Dependencies
```bash
npm install
```

### Start Development Server
```bash
npm run dev
```

The app will be available at [http://localhost:3100](http://localhost:3100)

### Run Tests
```bash
npm test
```

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## Project Structure

```
src/
├── components/
│   ├── layout/          # Header, Footer, Layout
│   ├── use-cases/       # UseCaseCard, FilterPanel
│   └── ui/              # Badge, Card (reusable components)
├── pages/               # Home, UseCases, UseCaseDetail, Compare, LearningPath
├── hooks/               # useUseCases (custom hooks)
├── utils/               # filters.ts (utility functions)
├── types/               # TypeScript types and Zod schemas
├── data/                # use-cases.json (sample data)
├── tests/               # Test setup
├── App.tsx              # Main app with routing
└── main.tsx             # Entry point
```

## Testing

The project includes 13 unit tests covering:
- Filter utility functions
- Badge component rendering
- UseCaseCard component behavior
- App routing and navigation

Run tests with:
```bash
npm test        # Run once
npm test:watch  # Watch mode
```

## Data Model

Use cases are stored in JSON format with the following structure:
- **id** - Unique identifier
- **slug** - URL-friendly slug
- **title** - Display title
- **shortDescription** - One-line description for cards
- **fullDescription** - Detailed description
- **industry** - Array of industries (finance, pharmaceuticals, etc.)
- **problemType** - optimization, simulation, machine-learning, or cryptography
- **maturityLevel** - theoretical, experimental, pre-production, or production-ready
- **quantumAdvantage** - Explanation of quantum vs classical advantage
- **timeline** - Current status, near-term (1-3 years), long-term (5+ years)
- **requirements** - Qubits, gate depth, error rate, coherence time
- **examples** - Real-world companies/projects
- **relatedUseCases** - IDs of related use cases

## Routes

- `/` - Landing page with hero and featured use cases
- `/use-cases` - Directory with filtering and search
- `/use-cases/:slug` - Individual use case detail page
- `/compare` - Side-by-side comparison tool
- `/learning-path` - Curated learning progression

## Future Enhancements

After prototype validation:
1. Add more use cases (target 50+)
2. User accounts and saved comparisons
3. Newsletter for quantum computing updates
4. Implementation guides and code samples
5. Community features (comments, ratings)

## License

Proprietary - ConnectSW
