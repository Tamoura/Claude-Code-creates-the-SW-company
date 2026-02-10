# ADR-001: Tech Stack Decisions

## Status

Accepted

## Context

Mu'aththir is a greenfield product in the ConnectSW portfolio. We need to select specific versions for all major dependencies. The choices must:

1. Align with the ConnectSW default stack (Fastify, Prisma, Next.js, PostgreSQL)
2. Avoid conflicts with other active products (Pulse, InvoiceForge, Stablecoin Gateway)
3. Use modern, well-supported versions for a product starting development in February 2026
4. Support the product's core needs: radar/spider charts, date-based calculations, image processing, and accessible UI components

Each product has its own `package.json` and lockfile, so there are no shared dependency constraints. The key decisions are version selection and library choice.

## Decisions

### 1. Backend: Fastify 5.x + Prisma 6.x

**Decision**: Use Fastify 5.x and Prisma 6.x (latest stable).

**Rationale**:
- Mu'aththir is a greenfield product with no legacy constraints. Starting with the latest stable versions avoids accumulating upgrade debt.
- InvoiceForge already runs Fastify 5.x + Prisma 6.x successfully, proving these versions work in the ConnectSW environment.
- Pulse runs on Fastify 4.x + Prisma 5.x, but its dependency versions do not constrain Mu'aththir since each product has isolated dependencies.
- Fastify 5.x has breaking changes from 4.x in error handling and plugin registration, but since we are building from scratch, there is no migration cost.
- Prisma 6.x improves query performance and adds JSON filtering capabilities that benefit our milestone `achieved_history` JSONB field.

**Specific versions**:
- `fastify`: ^5.0.0
- `@prisma/client`: ^6.0.0
- `prisma` (dev): ^6.0.0

### 2. Frontend: Next.js 14 + React 18 + Tailwind CSS 3 + shadcn/ui

**Decision**: Use Next.js 14 with App Router, React 18, Tailwind CSS 3, and shadcn/ui.

**Rationale**:
- Next.js 14 is the company standard. App Router provides server-side rendering for public pages (landing, pricing, about) and client-side rendering for the dashboard.
- React 18 is mature and stable with Suspense, concurrent features, and excellent ecosystem support.
- Tailwind CSS 3 is the company standard for styling.
- shadcn/ui provides accessible, customizable components built on Radix UI. It handles the hard accessibility problems (keyboard navigation, ARIA attributes, focus management) so we can focus on domain-specific UI.

**Why not Next.js 15**: Next.js 15 was released in late 2024 with React 19 as a dependency. React 19 introduces breaking changes in some lifecycle hooks and third-party library compatibility. Given that Recharts (our charting library) and shadcn/ui have mature React 18 support, staying on Next.js 14 + React 18 is the safer choice that avoids dependency conflicts.

### 3. Charting: Recharts 2.x

**Decision**: Use Recharts for radar charts, trend line charts, and bar charts.

**Alternatives considered**:

| Library | Pros | Cons |
|---------|------|------|
| **Recharts 2.x** | React-native (composable components), built-in RadarChart, responsive, good TypeScript support, active maintenance, 22k+ GitHub stars | Larger bundle (~140KB gzipped) than Chart.js |
| **Chart.js 4.x** | Lightweight (~60KB gzipped), canvas-based (fast rendering), react-chartjs-2 wrapper | Not React-native (imperative API wrapped in React), radar chart customization is limited, canvas makes accessibility harder |
| **D3.js 7.x** | Most flexible, handles any visualization, SVG-based (accessible) | Very low-level, significant implementation effort for radar charts, steep learning curve, no built-in React integration |
| **Nivo** | Built on D3, React-native, beautiful defaults | Radar chart support is limited, less customizable than Recharts for our specific needs |

**Why Recharts**:
- **RadarChart component**: Recharts has a purpose-built `<RadarChart>` component with `<PolarGrid>`, `<PolarAngleAxis>`, and `<Radar>` sub-components. This maps directly to our 6-dimension radar chart requirement.
- **React-native**: Recharts components are composable React components, not imperative canvas drawing. This aligns with our component-based architecture.
- **Accessibility**: SVG-based rendering means screen readers can access chart data. We can add a text-based alternative table alongside the chart (NFR-025) without fighting the charting library.
- **Responsive**: Built-in `<ResponsiveContainer>` handles resizing.
- **Trend charts**: We also need trend line charts for dimension detail pages (observation count and sentiment over time). Recharts handles both with `<LineChart>` and `<BarChart>`.
- **TypeScript**: Good TypeScript support with published type definitions.

**Bundle size mitigation**: Recharts is ~140KB gzipped, which is larger than Chart.js. However, the dashboard is a client-side SPA (not SSR), so this does not affect initial page load. We will use Next.js dynamic imports to lazy-load the charting components.

### 4. Date Handling: date-fns 3.x

**Decision**: Use date-fns for all date calculations.

**Rationale**:
- Age band calculation is a core feature. We need reliable year-difference calculations that handle leap years and edge cases correctly.
- `date-fns` provides `differenceInYears`, `format`, `parseISO`, `startOfMonth`, `subDays` -- all needed for our use cases.
- Tree-shakeable: only imports what we use, unlike Moment.js.
- Already listed in the addendum as a likely dependency.

### 5. Image Processing: sharp

**Decision**: Use sharp for child profile photo resizing.

**Rationale**:
- Child photos need to be resized to 200x200 pixels on upload (FR-007, acceptance criteria).
- sharp is the fastest Node.js image processing library (C++ bindings to libvips).
- Supports JPEG and PNG input/output.
- No dependency on ImageMagick or GraphicsMagick.

### 6. Validation: Zod 3.x

**Decision**: Use Zod for all API input validation.

**Rationale**:
- Company standard (PATTERN-015).
- Validates at API boundaries before data reaches handlers.
- Type inference: Zod schemas generate TypeScript types automatically.
- Composable: schemas can be reused between create and update operations.

### 7. Node.js: 20+ (LTS)

**Decision**: Target Node.js 20+ (LTS).

**Rationale**:
- Company standard.
- Built-in `fetch` for HTTP clients.
- Stable `crypto.randomUUID()` for token generation.
- V8 version supports modern JavaScript features.

## Consequences

### Positive

- Latest Fastify/Prisma versions avoid future upgrade work
- Recharts provides excellent radar chart support with minimal custom code
- All dependencies are actively maintained with large communities
- Consistent with InvoiceForge's stack, enabling component reuse
- TypeScript types available for all chosen libraries

### Negative

- Fastify 5.x plugins from the component registry (written for 4.x) may need minor adaptation for breaking changes in error handling and hook signatures
- Recharts bundle size (~140KB gzipped) is larger than Chart.js; mitigated by lazy loading
- date-fns adds a dependency for something that could be done with native Date (but native Date is error-prone for year calculations)

### Neutral

- Each product's dependency isolation means version choices do not cascade to other products
- Staying on Next.js 14 means we miss some Next.js 15 features (Partial Prerendering) but gain stability

## References

- Recharts documentation: https://recharts.org
- Recharts RadarChart: https://recharts.org/en-US/api/RadarChart
- Fastify 5.x migration guide: https://fastify.dev/docs/latest/Guides/Migration-Guide-V5
- Prisma 6.x release notes: https://www.prisma.io/blog
- ConnectSW Component Registry: `.claude/COMPONENT-REGISTRY.md`
