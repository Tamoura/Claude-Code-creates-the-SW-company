# ADR-001: Tech Stack Selection

**Status**: Accepted
**Date**: 2026-01-27
**Decision Makers**: Architect Agent
**Context**: Basic Calculator Web App

---

## Context

We need to select a frontend technology stack for the Basic Calculator. The application is:
- **Client-side only** (no backend, no database)
- A simple arithmetic calculator (addition, subtraction, multiplication, division)
- Targeting general users (students, professionals, shoppers)
- Must be mobile-responsive and accessible (WCAG 2.1 AA)
- Optimized for performance (<1s load on 3G, <100ms calculations)
- Ultra-simple scope compared to gpu-calculator

---

## Decision

### Framework: React 18 with Vite

**Choice**: React 18 + Vite

**Alternatives Considered**:

| Option | Pros | Cons | Why Not Chosen |
|--------|------|------|----------------|
| **React + Vite** ⭐ | Fast dev server, TypeScript support, component reusability | Slightly larger bundle than vanilla | **CHOSEN** - Best balance |
| Vanilla JavaScript | Smallest possible bundle, no dependencies | Longer development time, harder to maintain | Too simple → harder testing |
| Preact | Smaller bundle (3KB vs 45KB) | Smaller ecosystem, less familiar | Premature optimization |
| Next.js | Full-featured framework | Massive overkill for calculator, SSR not needed | Over-engineering |

**Decision Rationale**:
1. **Simplicity**: React provides component structure without over-engineering
2. **Vite**: Fast development experience, optimized production builds
3. **TypeScript**: Type safety for calculation logic prevents bugs
4. **Testing**: Easy to test React components with Vitest + RTL
5. **Reusability**: Display and Button components can be reused
6. **Company Standard**: Aligns with gpu-calculator pattern (PATTERN-006 from memory)

**Bundle Size Target**: < 100KB total (HTML + CSS + JS gzipped)

---

### Styling: Tailwind CSS

**Choice**: Tailwind CSS v3

**Alternatives Considered**:

| Option | Pros | Cons | Why Not Chosen |
|--------|------|------|----------------|
| **Tailwind CSS** ⭐ | Utility-first, small purged bundle, responsive utilities | Class verbosity | **CHOSEN** - Fastest development |
| Plain CSS | Zero dependencies, full control | Manual responsive design, naming conflicts | Slower development |
| CSS-in-JS | Co-located styles | Runtime overhead, larger bundle | Performance penalty |

**Decision Rationale**:
1. **Speed**: Utility classes enable rapid UI development
2. **Bundle Size**: Purged CSS produces ~10KB bundle
3. **Responsive**: Built-in breakpoints (`sm:`, `md:`, `lg:`)
4. **Accessibility**: Easy to add focus states, contrast
5. **Company Standard**: Used in gpu-calculator

---

### State Management: React Built-in (useState)

**Choice**: React useState hook only

**Alternatives Considered**:

| Option | Pros | Cons | Why Not Chosen |
|--------|------|------|----------------|
| **useState** ⭐ | Zero dependencies, simple, sufficient | None for this scope | **CHOSEN** - Perfect fit |
| Zustand | Simple global state | Overkill for single-component app | Unnecessary complexity |
| Redux Toolkit | Powerful debugging | Massive overkill | Way over-engineered |

**Decision Rationale**:
1. **Simplicity**: All state lives in one Calculator component
2. **No Global State Needed**: Single page, single calculator instance
3. **Zero Dependencies**: Smaller bundle, fewer vulnerabilities
4. **Learned Pattern**: PATTERN-005 from company knowledge - avoid global state for simple apps

**State Shape**:
```typescript
interface CalculatorState {
  currentValue: string;        // What user is typing (e.g., "42.5")
  previousValue: string | null; // Previous operand (e.g., "10")
  operation: '+' | '-' | '*' | '/' | null; // Current operation
  shouldResetDisplay: boolean;  // Reset display on next number input
}
```

---

### Language: TypeScript (Strict Mode)

**Choice**: TypeScript 5+ with strict mode enabled

**Rationale**:
1. **Calculation Safety**: Type checking prevents arithmetic errors
2. **IDE Support**: Better autocomplete and error detection
3. **Refactoring**: Safe refactoring as code evolves
4. **Documentation**: Types serve as inline documentation
5. **Company Standard**: All ConnectSW projects use TypeScript

**tsconfig.json settings**:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

---

### Build Tool: Vite 5

**Choice**: Vite 5

**Rationale**:
1. **Fast Dev Server**: Instant HMR with native ESM
2. **Optimized Builds**: Rollup-based tree-shaking
3. **TypeScript**: Native support, zero config
4. **Company Standard**: Used in gpu-calculator (DECISION-VITE-VS-NEXTJS from memory)

**Vite Config**:
```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3101, // Next available port after gpu-calculator (3100)
  },
  build: {
    target: 'es2020',
    minify: 'terser',
    sourcemap: true,
  },
})
```

---

### Testing: Vitest + React Testing Library + Playwright

**Choice**:
- **Unit Tests**: Vitest + React Testing Library
- **E2E Tests**: Playwright

**Rationale**:
1. **Vitest**: Native Vite integration, fast, Jest-compatible API
2. **React Testing Library**: Tests user behavior, not implementation details
3. **Playwright**: Cross-browser E2E testing, mobile emulation
4. **Company Standard**: PATTERN-003, PATTERN-004 from memory

**Coverage Target**: 80%+ (company standard)

---

### Linting/Formatting: ESLint + Prettier

**Choice**: ESLint (with TypeScript rules) + Prettier

**Configuration**:
- ESLint: `@typescript-eslint/recommended`, `react-hooks/recommended`
- Prettier: 2-space indent, single quotes, semicolons, trailing commas

---

## No Backend / No Database

**Decision**: Client-side only, no backend API, no database

**Rationale**:
1. **PRD Requirement**: Pure calculation tool, no data persistence
2. **Performance**: Eliminates network latency
3. **Privacy**: No data leaves user's browser
4. **Simplicity**: Zero infrastructure, zero hosting costs
5. **Offline-Capable**: Works after initial load

**Implications**:
- All calculations happen in browser JavaScript
- No user accounts, no login
- No calculation history (MVP - can add with localStorage in Phase 2)
- Can be hosted on static CDN (Vercel, Netlify, GitHub Pages)

---

## Consequences

### Positive
- **Fast Development**: Simple stack, no backend complexity
- **Performance**: Sub-second load time, instant calculations
- **Type Safety**: TypeScript prevents calculation bugs
- **Small Bundle**: < 100KB target easily achievable
- **Privacy**: No data collection, no server
- **Cost**: Free hosting on CDN

### Negative
- **No SSR**: Slightly worse SEO (acceptable for a calculator tool)
- **React Bundle**: ~45KB (larger than Preact/Svelte, but acceptable)

### Neutral
- **No Backend**: Means no user features in future without adding backend later

### Risks
- **Floating Point Precision**: JavaScript has floating point errors (0.1 + 0.2 = 0.30000000000000004)
  - Mitigation: See ADR-002 for decimal precision strategy

---

## Implementation Notes

### Folder Structure

```
products/basic-calculator/
├── src/
│   ├── components/
│   │   ├── Calculator.tsx      # Main calculator component
│   │   ├── Display.tsx         # Result display
│   │   ├── Button.tsx          # Reusable button component
│   │   └── ButtonGrid.tsx      # Calculator button layout
│   ├── calculators/
│   │   └── arithmetic.ts       # Pure calculation functions
│   ├── types/
│   │   └── calculator.ts       # TypeScript interfaces
│   ├── hooks/
│   │   └── useCalculator.ts    # Calculator state logic
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── e2e/
│   └── calculator.spec.ts      # Playwright E2E tests
├── public/
│   └── favicon.ico
├── index.html
├── vite.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

### Key Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.41.0",
    "@testing-library/react": "^14.2.0",
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
    "@testing-library/jest-dom": "^6.2.0",
    "jsdom": "^24.0.0"
  }
}
```

### Browser Support

Target modern browsers (last 2 years):
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## References

- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- Company Pattern DECISION-VITE-VS-NEXTJS (from architect.json memory)
- Company Pattern PATTERN-006 (Calculation Module Separation)
- GPU Calculator ADR-001 (similar tech stack)
