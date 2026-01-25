# AI GPU Usage Calculator - Web App

A client-side single-page application for calculating GPU costs across multiple cloud providers for AI training and inference workloads.

## Tech Stack

- **Framework**: React 18
- **Build Tool**: Vite 7
- **Language**: TypeScript 5.9
- **Styling**: Tailwind CSS 4
- **Testing**: Vitest + React Testing Library
- **State Management**: React useState/useReducer

## Project Structure

```
src/
├── components/
│   ├── layout/          # Header, Footer
│   ├── forms/           # TrainingForm, InferenceForm
│   ├── results/         # ComparisonGrid, ProviderCard
│   └── common/          # Reusable components (Tabs, Button, etc.)
├── calculators/         # Calculation engine
├── data/                # Pricing data (embedded)
├── types/               # TypeScript interfaces
├── hooks/               # Custom React hooks
└── utils/               # Validators, formatters
```

## Getting Started

### Prerequisites

- Node.js 18+ (with npm)

### Installation

```bash
npm install
```

### Development

Run the development server on port 3100:

```bash
npm run dev
```

Visit http://localhost:3100

### Testing

Run tests in watch mode:

```bash
npm test
```

Run tests once:

```bash
npm run test:run
```

Run tests with UI:

```bash
npm run test:ui
```

### Build

Build for production:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server on port 3100 |
| `npm run build` | Build for production |
| `npm test` | Run tests in watch mode |
| `npm run test:run` | Run tests once |
| `npm run test:ui` | Run tests with Vitest UI |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview production build |

## Development Workflow

1. All components should be developed with TypeScript
2. Follow the component structure defined in architecture.md
3. Write tests for all new components
4. Use Tailwind CSS for styling (mobile-first approach)
5. Ensure all tests pass before committing

## Architecture

See `/docs/architecture.md` for detailed architecture documentation.

See `/docs/data-model.md` for TypeScript type definitions.

## Current Status

### Completed

- Project scaffolding with Vite + React + TypeScript
- Tailwind CSS configuration (v4)
- TypeScript types from data-model.md
- Basic layout components (Header, Footer)
- Tab navigation component
- Training form placeholder
- Test setup with Vitest + React Testing Library
- All tests passing (3/3)
- Production build working

### Next Steps

1. Implement calculation engine (training, inference)
2. Add pricing data files
3. Create results display components
4. Add form validation
5. Implement storage and networking calculators
6. Add preset configurations
7. Implement export functionality

## Performance Targets

- Bundle size: <150KB gzipped
- First Contentful Paint: <1s
- Time to Interactive: <2s

## Accessibility

All components should follow WCAG 2.1 AA standards:
- Proper semantic HTML
- ARIA labels where needed
- Keyboard navigation support
- Color contrast compliance

## License

Proprietary - ConnectSW
