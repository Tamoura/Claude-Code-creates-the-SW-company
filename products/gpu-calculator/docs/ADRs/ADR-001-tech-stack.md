# ADR-001: Tech Stack Selection

**Status**: Accepted
**Date**: 2025-01-25
**Decision Makers**: Architect Agent
**Context**: AI GPU Usage Calculator MVP

---

## Context

We need to select a frontend technology stack for the AI GPU Usage Calculator. The application is:
- Client-side only (no backend)
- A calculation tool, not a complex application
- Targeting developers and technical users
- Open source with community contribution potential
- Required to be mobile-responsive
- Optimized for performance (<2s load, <500ms calculations)

---

## Decision

### Framework: React 18 with Vite

**Choice**: React 18 + Vite

**Alternatives Considered**:

| Option | Pros | Cons |
|--------|------|------|
| **React + Vite** | Largest ecosystem, TypeScript support, fast builds, wide familiarity | Bundle size slightly larger than alternatives |
| Vue 3 + Vite | Good DX, smaller bundle | Smaller community, fewer calculator libraries |
| Svelte + SvelteKit | Smallest bundle, no virtual DOM | Smaller ecosystem, learning curve for contributors |
| Next.js | Full-featured, good SEO | Overkill for client-only app, larger bundle |
| Vanilla JS | Smallest possible | Longer development time, harder to maintain |

**Decision Rationale**:
1. **Community**: React has the largest community, making it easier for open-source contributors
2. **Ecosystem**: Rich library ecosystem for forms, validation, and UI components
3. **Vite**: Provides fast development experience and optimized production builds
4. **TypeScript**: First-class support in React + Vite for type-safe calculations
5. **Familiarity**: Most developers know React, reducing onboarding friction

---

### Styling: Tailwind CSS

**Choice**: Tailwind CSS v3

**Alternatives Considered**:

| Option | Pros | Cons |
|--------|------|------|
| **Tailwind CSS** | Rapid development, small purged bundle, utility-first | Class verbosity in JSX |
| Styled Components | Co-located styles, dynamic styling | Runtime overhead, larger bundle |
| CSS Modules | Zero runtime, scoped styles | More files, slower development |
| Plain CSS | No dependencies | Naming conflicts, harder maintenance |

**Decision Rationale**:
1. **Speed**: Utility classes enable rapid prototyping
2. **Bundle Size**: Purged CSS produces tiny bundles (~10KB)
3. **Responsive**: Built-in responsive utilities (`md:`, `lg:`)
4. **Consistency**: Design system built-in (spacing, colors)
5. **Dark Mode**: Easy dark mode support for future

---

### State Management: React Built-in (useState/useReducer)

**Choice**: React useState and useReducer hooks

**Alternatives Considered**:

| Option | Pros | Cons |
|--------|------|------|
| **useState/useReducer** | No dependencies, simple, sufficient | Manual prop drilling |
| Zustand | Simple, small bundle | Additional dependency |
| Redux Toolkit | Powerful, time-travel debugging | Overkill for this app |
| Jotai | Atomic state, minimal | Another library to learn |

**Decision Rationale**:
1. **Simplicity**: App state is minimal (form inputs, results array)
2. **No Prop Drilling**: Only 2-3 levels of component nesting
3. **Zero Dependencies**: Fewer bytes, fewer vulnerabilities
4. **Predictable**: Simple state updates with useState

**State Shape**:
```typescript
// All state lives in App.tsx or Calculator component
interface AppState {
  activeTab: 'training' | 'inference';
  trainingInputs: TrainingConfig;
  inferenceInputs: InferenceConfig;
  results: ProviderResult[] | null;
  sortBy: 'cost' | 'name';
  filterAvailable: boolean;
}
```

---

### Language: TypeScript

**Choice**: TypeScript (strict mode)

**Rationale**:
1. **Calculation Safety**: Type checking prevents math errors
2. **IDE Support**: Better autocomplete for pricing data
3. **Documentation**: Types serve as documentation
4. **Refactoring**: Safe refactoring as app grows
5. **Community Standard**: Expected in modern React projects

---

### Build Tool: Vite

**Choice**: Vite 5

**Rationale**:
1. **Fast Dev Server**: Instant HMR with ESM
2. **Optimized Builds**: Rollup-based, tree-shaking, code-splitting
3. **TypeScript**: Native support, no config
4. **Community**: Widely adopted, good plugin ecosystem

---

### Testing: Vitest + React Testing Library + Playwright

**Choice**:
- **Unit/Integration**: Vitest + React Testing Library
- **E2E**: Playwright

**Rationale**:
1. **Vitest**: Native Vite integration, Jest-compatible API
2. **RTL**: Tests user behavior, not implementation
3. **Playwright**: Cross-browser E2E, good mobile emulation

---

### Linting/Formatting: ESLint + Prettier

**Choice**: ESLint (with TypeScript rules) + Prettier

**Configuration**:
- ESLint: `@typescript-eslint/recommended`, `react-hooks`
- Prettier: 2-space indent, single quotes, trailing commas

---

## Consequences

### Positive
- Fast development velocity with React + Tailwind
- Type safety reduces calculation bugs
- Large contributor pool for open source
- Small bundle size (<150KB gzipped)
- Fast build times with Vite

### Negative
- React bundle (~45KB) larger than Svelte/Preact
- Tailwind classes can clutter JSX
- No SSR (SEO less optimal, but acceptable for tool)

### Risks
- None significant for this scope

---

## Implementation Notes

### Package.json Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^8.57.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "postcss": "^8.4.0",
    "prettier": "^3.2.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.0",
    "vite": "^5.1.0",
    "vitest": "^1.3.0",
    "@testing-library/react": "^14.2.0",
    "@playwright/test": "^1.41.0"
  }
}
```

### Browser Support

```json
// package.json browserslist
"browserslist": [
  "last 2 Chrome versions",
  "last 2 Firefox versions",
  "last 2 Safari versions",
  "last 2 Edge versions"
]
```

---

## References

- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
