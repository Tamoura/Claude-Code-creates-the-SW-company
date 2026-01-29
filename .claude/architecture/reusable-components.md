# Reusable Components & Best Practices Guide

**Version**: 1.0.0
**Updated**: 2026-01-26
**Purpose**: Architect reference for choosing best-in-class solutions instead of building from scratch

## Overview

This guide provides 2-3 vetted alternatives for each common software building block. Architects must choose one option per category when designing new products, considering trade-offs, budget, and requirements.

**Key Principle**: Build on proven solutions, don't reinvent the wheel.

---

## Quick Decision Matrix

| Category | Simple/Budget | Balanced | Enterprise/Complex |
|----------|--------------|----------|-------------------|
| **Authentication** | NextAuth.js | Clerk | Auth0 |
| **Analytics/Charts** | Recharts | Apache ECharts | Custom (D3.js) |
| **Payments** | LemonSqueezy | Stripe | Paddle |
| **API Architecture** | REST | tRPC | GraphQL |
| **Forms** | React Hook Form | TanStack Form | React Hook Form |
| **UI Components** | shadcn/ui | Radix UI | Headless UI |

---

## 1. Authentication

### Option A: Clerk ⭐ Recommended for Most Projects

**What it is**: Modern, developer-friendly authentication platform with pre-built components.

**Best For**:
- New Next.js applications
- Teams prioritizing rapid implementation (5 minutes to production)
- Projects needing modern UI out of the box
- SaaS applications

**Pros**:
- ✅ Setup time: Under 5 minutes with pre-built components
- ✅ Free tier: 10,000 MAUs (Monthly Active Users)
- ✅ Purpose-built for React/Next.js with TypeScript support
- ✅ Webhook support for database syncing
- ✅ Excellent developer experience (10/10 rating)
- ✅ Modern authentication flows (passkeys, MFA, social login)

**Cons**:
- ❌ Shorter track record than Auth0 (less enterprise history)
- ❌ Pricing escalates at scale
- ❌ Bundle size: Can represent up to 50% of total app size with pre-built components
- ❌ Vendor lock-in (managed service)

**Pricing**:
- Free: 10,000 MAUs
- Pro: Scales linearly per MAU

**Integration**:
```typescript
// app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs'

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}

// Protected route
import { auth } from '@clerk/nextjs'
export default async function Dashboard() {
  const { userId } = auth()
  if (!userId) redirect('/sign-in')
  // ...
}
```

**When to Choose**:
- Building new Next.js apps
- Want authentication working in < 1 hour
- Budget allows per-MAU pricing
- Prefer managed service over self-hosted

**Decision Log Template**:
```json
{
  "decision": "Use Clerk for authentication",
  "rationale": "5-minute setup, excellent DX, free tier covers MVP, TypeScript-first",
  "trade_offs": "Vendor lock-in acceptable, bundle size manageable for our use case",
  "alternatives_considered": ["NextAuth.js", "Auth0"]
}
```

---

### Option B: NextAuth.js (Auth.js v5)

**What it is**: Open-source authentication library for Next.js with complete flexibility.

**Best For**:
- Data ownership requirements (GDPR, HIPAA)
- Budget constraints (no per-MAU fees)
- Maximum customization needed
- Teams with strong engineering capacity

**Pros**:
- ✅ Zero vendor lock-in (open source, self-hosted)
- ✅ Complete data ownership
- ✅ No per-MAU pricing (infrastructure costs only)
- ✅ Maximum flexibility and customization
- ✅ Strong community support

**Cons**:
- ❌ Setup complexity: 1-3 hours for basic, more for custom UI
- ❌ Requires database setup, adapters, custom logic
- ❌ More development time vs managed services
- ❌ You handle security updates and maintenance

**Pricing**: Free (infrastructure costs only)

**Integration**:
```typescript
// auth.ts
import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [GitHub],
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id
      return session
    }
  }
})
```

**When to Choose**:
- Data residency requirements (EU, healthcare)
- Cannot afford per-MAU pricing
- Need custom authentication flows
- Have engineering bandwidth

**Maintenance**: ~5 hours/month (security updates, bug fixes)

---

### Option C: Auth0

**What it is**: Enterprise identity platform with 10+ years in market, extensive compliance.

**Best For**:
- Enterprise requirements (complex federation, SSO)
- Organizations already using Okta products
- Applications needing extensive compliance certifications
- B2B SaaS with enterprise customers

**Pros**:
- ✅ Industry-leading compliance (SOC 2 Type II)
- ✅ Advanced threat detection and anomaly detection
- ✅ 10+ year track record
- ✅ Extensive enterprise features (SSO, SAML, custom domains)
- ✅ Robust API and documentation

**Cons**:
- ❌ Setup complexity: Days to weeks for complex implementations
- ❌ Universal Login requirement (forces redirects, no embedded auth)
- ❌ Pricing "growth penalty": 15x cost increase when crossing tiers
- ❌ Free tier reduced: 7,500 MAUs (down from 25,000 in 2024)

**Pricing**:
- Free: 7,500 MAUs
- Essentials: $240/month base
- Professional: Custom pricing
- **Warning**: Pricing can jump 15x when crossing tier thresholds

**When to Choose**:
- Enterprise sales motion (need SOC 2, SSO)
- Complex federation requirements
- Budget allows enterprise pricing
- Need battle-tested compliance

---

### Better Auth (Emerging Alternative)

**Note**: Emerging TypeScript-first open-source solution. Monitor for production readiness.

**Pros**: Type-safe, modern DX, self-hosted, predictable pricing
**Status**: Consider for new projects in 2026+

---

## Authentication Decision Tree

```
Start
  ↓
Need enterprise compliance (SOC 2, SAML)?
  ├─ YES → Auth0
  └─ NO ↓
     ↓
Have data residency requirements?
  ├─ YES → NextAuth.js
  └─ NO ↓
     ↓
Building Next.js app with budget for managed service?
  ├─ YES → Clerk ⭐
  └─ NO → NextAuth.js
```

---

## 2. Analytics & Reporting (Charts/Dashboards)

### Option A: Recharts ⭐ Recommended for Standard Dashboards

**What it is**: React-specific chart library using SVG with declarative JSX API.

**Best For**:
- SaaS dashboards
- Marketing analytics
- Admin panels
- Datasets < 100 data points per chart

**Pros**:
- ✅ Built specifically for React (JSX-style API)
- ✅ Clean SVG rendering
- ✅ Simple, intuitive API
- ✅ Strong community support
- ✅ "Drop-in, batteries included"
- ✅ Fast time-to-implementation

**Cons**:
- ❌ Performance issues with 5,000+ data points (DOM thrashing)
- ❌ Less flexibility than lower-level libraries
- ❌ All-SVG approach limits scalability

**Bundle Size**: ~400 KB (gzipped: ~100 KB)

**Use Cases**:
- Line charts, bar charts, pie charts
- Low-density, high-fidelity dashboards
- Straightforward business metrics

**Integration**:
```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const data = [
  { month: 'Jan', revenue: 4000 },
  { month: 'Feb', revenue: 3000 },
  // ...
];

<LineChart width={600} height={300} data={data}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="month" />
  <YAxis />
  <Tooltip />
  <Line type="monotone" dataKey="revenue" stroke="#8884d8" />
</LineChart>
```

**When to Choose**:
- Standard business dashboards
- Data density < 100 points/chart
- Want to ship fast
- Team familiar with React

---

### Option B: Apache ECharts

**What it is**: Enterprise-grade charting with GPU acceleration, handles millions of data points.

**Best For**:
- IoT dashboards (sensor data, telemetry)
- Financial trading platforms
- Logistics/operations with huge datasets
- Geospatial visualizations (maps, heatmaps)

**Pros**:
- ✅ Hybrid rendering: WebGL, Canvas, SVG
- ✅ Handles millions of data points
- ✅ Advanced chart types (3D charts, heatmaps, geospatial)
- ✅ GPU-accelerated Canvas mode
- ✅ Dynamic data loading and drill-down
- ✅ Industry-leading performance for large datasets

**Cons**:
- ❌ Larger, more complex API
- ❌ Steeper learning curve
- ❌ Overkill for simple dashboards

**Bundle Size**: ~800 KB (gzipped: ~250 KB) - but tree-shakeable

**Use Cases**:
- Real-time IoT monitoring (100k+ points)
- Financial market data
- Logistics tracking (maps + data)
- Scientific visualizations

**Integration**:
```tsx
import * as echarts from 'echarts';
import { useEffect, useRef } from 'react';

function Chart({ data }) {
  const chartRef = useRef(null);

  useEffect(() => {
    const chart = echarts.init(chartRef.current, null, {
      renderer: 'canvas' // or 'svg' or 'webgl'
    });

    chart.setOption({
      xAxis: { type: 'category', data: data.labels },
      yAxis: { type: 'value' },
      series: [{ data: data.values, type: 'line' }]
    });

    return () => chart.dispose();
  }, [data]);

  return <div ref={chartRef} style={{ width: '600px', height: '400px' }} />;
}
```

**When to Choose**:
- Massive datasets (1M+ points)
- Real-time streaming data
- Need advanced visualizations (heatmaps, 3D)
- Have engineering resources for complex setup

---

### Option C: Chart.js (via react-chartjs-2)

**What it is**: Lightweight Canvas-based charting library with React wrapper.

**Best For**:
- Mid-range complexity (100-10,000 points)
- Streaming data
- Mobile-responsive dashboards
- Teams wanting Canvas performance without complexity

**Pros**:
- ✅ Canvas rendering (better than SVG for medium datasets)
- ✅ Simpler than ECharts, more scalable than Recharts
- ✅ Excellent documentation
- ✅ Animation support
- ✅ Responsive by default

**Cons**:
- ❌ Less "React-like" than Recharts
- ❌ Fewer chart types than ECharts

**Bundle Size**: ~200 KB (gzipped: ~60 KB)

**When to Choose**:
- Need balance between simplicity and performance
- Datasets: 100-10,000 points
- Want Canvas benefits without ECharts complexity

---

## Analytics Decision Tree

```
How many data points per chart?
  ├─ < 100 → Recharts ⭐
  ├─ 100-10K → Chart.js
  └─ > 10K → Apache ECharts

OR

What type of visualization?
  ├─ Standard (line, bar, pie) → Recharts
  ├─ Maps, geospatial, 3D → Apache ECharts
  └─ Real-time streaming → Chart.js or ECharts
```

---

## 3. Payment Processing

### Option A: Stripe ⭐ Recommended for SaaS

**What it is**: Payment facilitator with most powerful, flexible payment infrastructure.

**Best For**:
- Serious SaaS businesses
- Products needing subscription billing
- Teams wanting full control over financial stack
- Scale-ups and enterprises

**Pros**:
- ✅ Lowest fees: 2.9% + 30¢ per transaction
- ✅ Most powerful and flexible platform
- ✅ Extensive API and documentation
- ✅ Strong developer ecosystem
- ✅ Subscription management built-in (Stripe Billing)
- ✅ Revenue recognition, invoicing, tax calculation

**Cons**:
- ❌ You handle tax compliance (VAT, sales tax)
- ❌ More development work (2 days vs 2 hours)
- ❌ Requires ~5 hours/month maintenance
- ❌ Steeper learning curve

**Pricing**:
- Standard: 2.9% + 30¢ per successful charge
- **Stripe MoR (Beta 2026)**: +3.5% fee on top (total: ~6.4%)

**Integration**:
```typescript
// app/api/checkout/route.ts
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req: Request) {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price: 'price_xxx', // Your product price ID
      quantity: 1,
    }],
    mode: 'subscription',
    success_url: `${process.env.NEXT_PUBLIC_URL}/success`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/cancel`,
  });

  return Response.json({ sessionId: session.id });
}
```

**Maintenance**: ~5 hours/month (webhooks, error handling, updates)

**When to Choose**:
- Building scalable SaaS
- Want lowest transaction fees
- Have engineering bandwidth
- Need full control and flexibility
- Can handle tax compliance

---

### Option B: LemonSqueezy

**What it is**: Merchant of Record (MoR) that handles taxes, compliance, and payment processing.

**Best For**:
- Digital products (ebooks, courses, software)
- Solo founders / small teams
- Selling globally (100+ countries)
- Teams terrified of tax compliance

**Pros**:
- ✅ MoR handles all taxes and compliance
- ✅ Setup time: Under 2 hours for complete checkout
- ✅ Lower maintenance: ~1 hour/month
- ✅ 40% fewer payment-related support tickets
- ✅ Simple, founder-friendly
- ✅ Acquired by Stripe (2024) but remains separate

**Cons**:
- ❌ Higher fees: 5% + 50¢ per transaction
- ❌ Less control than Stripe
- ❌ Fewer advanced features

**Pricing**: 5% + 50¢ per transaction

**When to Choose**:
- Solo founder or small team
- Selling digital products globally
- Don't want to deal with taxes
- Value simplicity over cost savings

**Cost Comparison Example**:
```
$1,000 in monthly revenue:
- Stripe: $29 + 30¢×transactions ≈ $35-40
- LemonSqueezy: $50 + 50¢×transactions ≈ $60-70

Trade-off: Pay ~$25/month more for zero tax headaches
```

---

### Option C: Paddle

**What it is**: Merchant of Record focused on SaaS, handles global VAT and subscriptions.

**Best For**:
- SaaS companies selling globally
- Teams needing MoR but want more features than LemonSqueezy
- B2B SaaS with subscription billing

**Pros**:
- ✅ MoR handles taxes and compliance
- ✅ Robust SaaS features (subscription management)
- ✅ Global VAT compliance
- ✅ Good for B2B sales
- ✅ Long-standing leader in MoR space

**Cons**:
- ❌ Same fee structure as LemonSqueezy: 5% + 50¢
- ❌ More complex than LemonSqueezy
- ❌ Less flexible than Stripe

**Pricing**: 5% + 50¢ per transaction

**When to Choose**:
- SaaS selling globally
- Need MoR but want more features
- B2B subscription model

---

## Payment Processing Decision Tree

```
Do you need Merchant of Record (auto tax handling)?
  ├─ YES ↓
  │   └─ Are you solo/small team selling digital products?
  │       ├─ YES → LemonSqueezy
  │       └─ NO (SaaS) → Paddle
  │
  └─ NO ↓
      └─ Can you handle tax compliance + development?
          ├─ YES → Stripe ⭐
          └─ NO → LemonSqueezy (easier)
```

**Key Insight**: Pay 2-3% more for MoR to eliminate tax complexity, or use Stripe for lowest fees + maximum control.

---

## 4. API Architecture

### Option A: tRPC ⭐ Recommended for TypeScript Monorepos

**What it is**: Type-safe RPC framework for TypeScript, end-to-end type safety with zero codegen.

**Best For**:
- Full-stack TypeScript applications (Next.js)
- Monorepos (frontend + backend in same repo)
- Internal tools and admin panels
- Teams prioritizing developer experience and type safety

**Pros**:
- ✅ End-to-end type safety (client auto-typed from server)
- ✅ Zero manual type definitions or codegen
- ✅ Instant refactoring feedback (rename breaks across stack)
- ✅ Fastest development velocity for TypeScript teams
- ✅ Smallest bundle size
- ✅ Built-in React Query integration

**Cons**:
- ❌ TypeScript-only (not for polyglot environments)
- ❌ Not suitable for public APIs
- ❌ Tight client-server coupling (feature, not bug, for monorepos)
- ❌ Less suitable for mobile apps or third-party integrations

**Performance**: Fastest for TypeScript-to-TypeScript communication

**Integration**:
```typescript
// server/routers/user.ts
import { z } from 'zod';
import { publicProcedure, router } from '../trpc';

export const userRouter = router({
  getById: publicProcedure
    .input(z.string())
    .query(async ({ input, ctx }) => {
      return ctx.prisma.user.findUnique({ where: { id: input } });
    }),

  create: publicProcedure
    .input(z.object({ name: z.string(), email: z.string().email() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.prisma.user.create({ data: input });
    }),
});

// client/components/UserProfile.tsx
import { trpc } from '@/utils/trpc';

function UserProfile({ userId }: { userId: string }) {
  // Type-safe! If you change server types, this breaks at compile time
  const { data: user, isLoading } = trpc.user.getById.useQuery(userId);

  if (isLoading) return <div>Loading...</div>;
  return <div>{user.name}</div>; // user is fully typed
}
```

**When to Choose**:
- Building Next.js full-stack app
- Monorepo setup
- Internal tools
- Team is TypeScript-first
- Not building public API

**Best Practices**:
- Use Zod for input validation
- Keep procedures focused and explicitly typed
- Export router types for client inference
- Document procedures despite strong typing

---

### Option B: REST

**What it is**: Traditional HTTP-based architecture using standard methods (GET, POST, PUT, DELETE).

**Best For**:
- Public-facing APIs
- APIs supporting multiple languages/platforms
- Long-term backward compatibility requirements
- Simple CRUD operations

**Pros**:
- ✅ Universal compatibility (any language, platform)
- ✅ Simple to understand and implement
- ✅ Excellent caching (HTTP cache, CDN)
- ✅ Battle-tested (decades of use)
- ✅ Easy to version (/api/v1, /api/v2)
- ✅ OpenAPI/Swagger for documentation

**Cons**:
- ❌ Over-fetching or under-fetching data
- ❌ Multiple round-trips for related data
- ❌ Manual type synchronization between client/server
- ❌ Versioning can become complex

**Performance**: Baseline - 922ms avg (simple queries)

**Integration**:
```typescript
// app/api/users/[id]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = await prisma.user.findUnique({
    where: { id: params.id }
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const user = await prisma.user.update({
    where: { id: params.id },
    data: body
  });
  return NextResponse.json(user);
}
```

**Best Practices**:
- Use clear resource URLs: `/users/42/orders`
- Apply HTTP verbs consistently (GET, POST, PUT, DELETE, PATCH)
- Use proper status codes (200, 201, 400, 404, 500)
- Version from day one: `/api/v1/users`
- Document with OpenAPI/Swagger
- Plan for breaking changes

**When to Choose**:
- Public API for third-party developers
- Supporting multiple languages (mobile, web, backend)
- Need long-term stability and compatibility
- Simple CRUD operations
- Team lacks GraphQL/tRPC expertise

---

### Option C: GraphQL

**What it is**: Query language allowing clients to request exactly the data they need.

**Best For**:
- Complex UIs with variable data needs
- Mobile apps (reduce over-fetching)
- Aggregating data from multiple sources
- APIs powering multiple diverse clients

**Pros**:
- ✅ Client-driven data fetching (no over-fetching)
- ✅ Single endpoint for all data
- ✅ Strong typing with schema
- ✅ Excellent for complex, nested data
- ✅ Great developer tools (GraphQL Playground, Apollo Studio)
- ✅ Federation for microservices

**Cons**:
- ❌ Complexity: N+1 query problems, caching challenges
- ❌ Performance: 1865ms avg (vs REST 922ms for simple queries)
- ❌ Steeper learning curve
- ❌ Requires careful optimization (DataLoader, batching)
- ❌ More infrastructure complexity

**Performance**: Slower than REST for simple queries, but can be faster for complex nested data

**Integration**:
```typescript
// graphql/schema.ts
import { makeExecutableSchema } from '@graphql-tools/schema';

const typeDefs = `
  type User {
    id: ID!
    name: String!
    email: String!
    orders: [Order!]!
  }

  type Order {
    id: ID!
    total: Float!
    user: User!
  }

  type Query {
    user(id: ID!): User
    users: [User!]!
  }
`;

const resolvers = {
  Query: {
    user: (_, { id }, { prisma }) => prisma.user.findUnique({ where: { id } }),
    users: (_, __, { prisma }) => prisma.user.findMany(),
  },
  User: {
    orders: (parent, _, { prisma }) =>
      prisma.order.findMany({ where: { userId: parent.id } }),
  },
};

// client
import { useQuery, gql } from '@apollo/client';

const GET_USER = gql`
  query GetUser($id: ID!) {
    user(id: $id) {
      name
      email
      orders {
        total
      }
    }
  }
`;

function UserProfile({ userId }) {
  const { data, loading } = useQuery(GET_USER, { variables: { id: userId } });
  // ...
}
```

**Best Practices**:
- Enforce schemas with GraphQL Codegen
- Optimize resolvers (DataLoader for batching)
- Use persisted queries in production
- Implement proper authentication and field-level security
- Monitor query complexity and depth

**When to Choose**:
- Complex UI with diverse data needs
- Mobile apps (bandwidth concerns)
- Aggregating multiple backend sources
- Team has GraphQL expertise
- Performance optimization resources available

---

## API Architecture Decision Tree

```
Is your stack full TypeScript (Next.js monorepo)?
  ├─ YES → tRPC ⭐
  └─ NO ↓
      ↓
Is this a public API for third parties?
  ├─ YES → REST
  └─ NO ↓
      ↓
Do you have complex, nested data with variable client needs?
  ├─ YES (and have GraphQL expertise) → GraphQL
  └─ NO → REST (simplest, most compatible)
```

**2026 Trend**: tRPC adoption growing rapidly for internal TypeScript apps, REST remains king for public APIs.

---

## 5. Form Management

### Option A: React Hook Form ⭐ Recommended for Most Projects

**What it is**: Performance-focused form library using uncontrolled components and React hooks.

**Best For**:
- Applications requiring high performance
- Large forms with many fields
- Projects prioritizing minimal re-renders
- Production SaaS applications

**Pros**:
- ✅ Smallest bundle: 12.12 KB gzipped
- ✅ Minimal re-renders (best performance)
- ✅ Excellent TypeScript support
- ✅ Built-in validation (yup, zod, joi)
- ✅ 1.9M+ weekly npm downloads
- ✅ DevTools for debugging

**Cons**:
- ❌ Uncontrolled components can be less intuitive initially
- ❌ Slightly steeper learning curve than Formik

**Integration**:
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type FormData = z.infer<typeof schema>;

function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (data: FormData) => {
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} />
      {errors.email && <span>{errors.email.message}</span>}

      <input type="password" {...register('password')} />
      {errors.password && <span>{errors.password.message}</span>}

      <button type="submit">Submit</button>
    </form>
  );
}
```

**When to Choose**:
- Building production applications
- Performance is important
- Large or complex forms
- Want smallest bundle size
- Team comfortable with uncontrolled components

**Best Practices**:
- Use Zod or Yup for schema validation
- Implement field-level errors
- Use Controller for custom components
- Leverage DevTools in development

---

### Option B: TanStack Form

**What it is**: Framework-agnostic form library with first-class TypeScript support, from creators of TanStack Query.

**Best For**:
- Large-scale applications requiring strict type safety
- Complex forms with dynamic fields
- Projects needing framework-agnostic solution
- Teams already using TanStack ecosystem

**Pros**:
- ✅ Best-in-class TypeScript support
- ✅ Framework-agnostic (React, Vue, Solid, etc.)
- ✅ Zero dependencies
- ✅ First-class memoization
- ✅ Excellent for complex, reusable form components

**Cons**:
- ❌ Newer (less battle-tested than RHF)
- ❌ Smaller community
- ❌ Slightly larger API surface

**Integration**:
```typescript
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { z } from 'zod';

function LoginForm() {
  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
    onSubmit: async ({ value }) => {
      console.log(value);
    },
    validatorAdapter: zodValidator,
  });

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      form.handleSubmit();
    }}>
      <form.Field
        name="email"
        validators={{
          onChange: z.string().email(),
        }}
        children={(field) => (
          <>
            <input
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            {field.state.meta.errors && (
              <span>{field.state.meta.errors}</span>
            )}
          </>
        )}
      />
      <button type="submit">Submit</button>
    </form>
  );
}
```

**When to Choose**:
- Need framework-agnostic solution
- Building complex, reusable form components
- Prioritize type safety above all else
- Already using TanStack Query/Router

---

### Option C: Formik

**What it is**: Popular form library with simple API, good for beginners.

**Best For**:
- Beginners learning React forms
- Simple forms
- Teams wanting straightforward API

**Pros**:
- ✅ Simple, intuitive API
- ✅ Large community (33.3k GitHub stars)
- ✅ Good documentation
- ✅ Easy to learn

**Cons**:
- ❌ Larger bundle: 44.34 KB gzipped (4x React Hook Form)
- ❌ More re-renders than RHF (performance)
- ❌ Relatively quiet on support/updates
- ❌ Founding team less active

**When to Choose**:
- Beginners
- Simple forms only
- Performance not critical
- Want simplest possible API

**Note**: For new projects in 2026, React Hook Form or TanStack Form recommended over Formik.

---

## Form Management Decision Tree

```
What's your priority?
  ├─ Performance + Production-ready → React Hook Form ⭐
  ├─ Type safety + Framework-agnostic → TanStack Form
  └─ Simplicity + Learning → Formik

OR

Application type?
  ├─ Production SaaS → React Hook Form
  ├─ Large enterprise app → TanStack Form
  └─ Prototype/MVP → Any (RHF for best long-term choice)
```

---

## 6. UI Component Libraries

### Option A: shadcn/ui ⭐ Recommended for Custom Design Systems

**What it is**: Copy-paste component collection built on Radix UI primitives with Tailwind CSS styling.

**Best For**:
- Custom design systems
- Teams using Tailwind CSS
- Projects needing full component control
- SaaS applications, dev tools, marketing sites

**Pros**:
- ✅ Full ownership: Components copied into your codebase
- ✅ Complete customization without fighting library
- ✅ Built on accessibility-first Radix UI primitives
- ✅ Tailwind CSS styling (modern, utility-first)
- ✅ No vendor lock-in
- ✅ Now supports both Radix UI and Base UI

**Cons**:
- ❌ Not a traditional library (manual updates)
- ❌ Need to maintain copied code yourself
- ❌ Requires Tailwind CSS setup

**Components**: 50+ components (Button, Dialog, Dropdown, Form, Table, etc.)

**Integration**:
```bash
# Install shadcn CLI
npx shadcn-ui@latest init

# Add components as needed
npx shadcn-ui@latest add button
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add form
```

```tsx
// Components are now in your codebase
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

function MyComponent() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <p>Your content here</p>
      </DialogContent>
    </Dialog>
  );
}
```

**Customization**:
```tsx
// Modify copied component directly in your codebase
// components/ui/button.tsx
export function Button({ className, variant, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium",
        // Add your custom styles
        variant === "custom" && "bg-brand-purple text-white",
        className
      )}
      {...props}
    />
  );
}
```

**When to Choose**:
- Building custom design system
- Using Tailwind CSS
- Want complete control over components
- Building SaaS, marketing sites, or developer tools
- Team comfortable maintaining component code

**Best Practice**: Use as foundation, customize to your brand.

---

### Option B: Radix UI

**What it is**: Low-level, unstyled component primitives focused on accessibility and composability.

**Best For**:
- Teams wanting full style control
- Building design systems from scratch
- Projects with existing design language
- Developers who want composable primitives

**Pros**:
- ✅ Unstyled (bring your own CSS)
- ✅ Best-in-class accessibility (full ARIA support)
- ✅ Highly composable
- ✅ Tree-shakeable
- ✅ Framework-agnostic (mostly)
- ✅ Small bundle sizes

**Cons**:
- ❌ No styling (must style everything yourself)
- ❌ More setup work than styled libraries
- ❌ **Important**: Radix UI announced less active maintenance in 2025

**Maintenance Concern**: Consider Base UI or React Aria as alternatives due to reduced Radix maintenance.

**Integration**:
```tsx
import * as Dialog from '@radix-ui/react-dialog';

function MyDialog() {
  return (
    <Dialog.Root>
      <Dialog.Trigger className="your-button-styles">
        Open
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="your-overlay-styles" />
        <Dialog.Content className="your-content-styles">
          <Dialog.Title>Dialog Title</Dialog.Title>
          <Dialog.Description>Description</Dialog.Description>
          <Dialog.Close>Close</Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

**When to Choose**:
- Building design system from scratch
- Have strong design team
- Want zero styling opinions
- Need maximum flexibility

**2026 Note**: Monitor alternatives (Base UI, React Aria) due to maintenance concerns.

---

### Option C: Headless UI

**What it is**: Unstyled component library from Tailwind Labs providing behavior without styling.

**Best For**:
- Teams using Tailwind CSS
- Projects needing accessibility without design constraints
- Full design freedom while offloading complex logic

**Pros**:
- ✅ Unstyled (complete design freedom)
- ✅ Built by Tailwind team (great with Tailwind)
- ✅ Handles accessibility, keyboard nav, state management
- ✅ Simpler API than Radix
- ✅ Actively maintained

**Cons**:
- ❌ Fewer components than Radix
- ❌ Primarily React + Vue only
- ❌ Must handle all styling

**Components**: Dialog, Dropdown, Listbox, Menu, Popover, Radio Group, Switch, Tabs, Transition

**Integration**:
```tsx
import { Dialog, Transition } from '@headlessui/react';
import { useState, Fragment } from 'react';

function MyDialog() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={() => setIsOpen(false)}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
        >
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
          >
            <Dialog.Panel className="bg-white rounded p-6">
              <Dialog.Title className="text-lg font-bold">
                Title
              </Dialog.Title>
              <p>Content</p>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
```

**When to Choose**:
- Using Tailwind CSS
- Want unstyled but simpler than Radix
- Need accessibility built-in
- Prefer Tailwind team's approach

---

### Alternative: MUI (Material-UI)

**What it is**: Comprehensive component library implementing Material Design.

**Best For**: Teams wanting pre-styled components with Material Design aesthetic.

**Pros**: Complete design system, extensive components, enterprise-ready
**Cons**: Opinionated design, larger bundle, less flexibility

**When to Choose**: Need complete UI solution fast, Material Design acceptable

---

## UI Components Decision Tree

```
Do you want styled or unstyled components?

STYLED (ready-to-use):
  └─ Need custom design system with Tailwind?
      ├─ YES → shadcn/ui ⭐
      └─ NO → MUI or other styled library

UNSTYLED (maximum control):
  └─ Using Tailwind CSS?
      ├─ YES → Headless UI (simpler) or shadcn/ui ⭐
      └─ NO → Radix UI (or Base UI/React Aria in 2026+)
```

**2026 Recommendation**: shadcn/ui is the clear winner for most projects - gives you Radix accessibility with Tailwind styling and complete ownership.

---

## Best Practices Summary

### For Every Category:

1. **Start with Recommended Option**: Try the ⭐ option first unless you have specific constraints
2. **Consider Trade-offs**: No perfect solution - understand what you're giving up
3. **Document Decision**: Use decision log template (Phase 1) to record rationale
4. **Prototype First**: Build small proof-of-concept before committing
5. **Monitor Trends**: Technology landscape evolves - revisit annually

### Integration Checklist:

For each component you integrate:

- [ ] TypeScript types configured
- [ ] Environment variables set
- [ ] Error handling implemented
- [ ] Documentation updated
- [ ] Team trained on usage
- [ ] Monitoring/logging added
- [ ] Security review completed
- [ ] Cost/pricing reviewed
- [ ] Fallback/rollback plan defined

---

## Decision Templates

### For Architects:

When choosing a solution, document in `.claude/memory/decision-log.json`:

```json
{
  "id": "DEC-XXX",
  "date": "2026-01-26",
  "category": "authentication",
  "question": "Which authentication provider for [product]?",
  "options_evaluated": ["Clerk", "NextAuth.js", "Auth0"],
  "chosen": "Clerk",
  "rationale": "Next.js project, rapid development needed, budget allows per-MAU pricing",
  "trade_offs_accepted": "Vendor lock-in acceptable, bundle size manageable",
  "cost_analysis": {
    "mvp_monthly": "$0 (free tier)",
    "production_estimated": "$50-100/month at 5K MAUs"
  },
  "alternatives_rejected": {
    "NextAuth.js": "Team lacks bandwidth for setup + maintenance",
    "Auth0": "Pricing too expensive for startup budget"
  }
}
```

---

## Architecture Review Checklist

Before finalizing product architecture:

- [ ] Authentication: Choice documented with rationale
- [ ] Analytics: Chart library chosen based on data volume
- [ ] Payments: MoR vs facilitator decision made
- [ ] API: REST/tRPC/GraphQL chosen with justification
- [ ] Forms: Library selected based on complexity
- [ ] UI: Component library aligned with design needs
- [ ] All choices logged in decision-log.json
- [ ] Team trained on chosen technologies
- [ ] Documentation created for each integration
- [ ] Monitoring/alerting planned

---

## Sources

This guide was compiled from extensive research in January 2026. Key sources:

### Authentication:
- [Better Auth vs NextAuth (Authjs) vs Auth0](https://betterstack.com/community/guides/scaling-nodejs/better-auth-vs-nextauth-authjs-vs-autho/)
- [User Authentication for Next.js: Top Tools and Recommendations for 2025](https://clerk.com/articles/user-authentication-for-nextjs-top-tools-and-recommendations-for-2025)
- [Clerk vs Auth0 for Next.js: The Definitive Technical Comparison](https://clerk.com/articles/clerk-vs-auth0-for-nextjs)
- [NextAuth.js vs Clerk vs Auth.js — Which Is Best for Your Next.js App in 2025?](https://chhimpashubham.medium.com/nextauth-js-vs-clerk-vs-auth-js-which-is-best-for-your-next-js-app-in-2025-fc715c2ccbfd)

### Analytics/Charts:
- [8 Best React Chart Libraries for Visualizing Data in 2025](https://embeddable.com/blog/react-chart-libraries)
- [Best React chart libraries (2025 update): Features, performance & use cases](https://blog.logrocket.com/best-react-chart-libraries-2025/)
- [Best Chart Libraries for React Projects in 2026](https://weavelinx.com/best-chart-libraries-for-react-projects-in-2026/)

### Payments:
- [Stripe vs Paddle vs Lemon Squeezy: I Processed $10K Through Each](https://medium.com/@muhammadwaniai/stripe-vs-paddle-vs-lemon-squeezy-i-processed-10k-through-each-heres-what-actually-matters-27ef04e4cb43)
- [LemonSqueezy vs Stripe: Which Payment Platform Is Best for Your Business?](https://noda.live/articles/lemonsqueezy-vs-stripe)
- [Choosing the Right Payment Provider for Your SaaS](https://supastarter.dev/blog/saas-payment-providers-stripe-lemonsqueezy-polar-creem-comparison)

### API Architecture:
- [REST vs GraphQL vs tRPC: The Ultimate API Design Guide for 2026](https://dev.to/dataformathub/rest-vs-graphql-vs-trpc-the-ultimate-api-design-guide-for-2026-8n3)
- [tRPC vs GraphQL vs REST: Choosing the right API design](https://sdtimes.com/graphql/trpc-vs-graphql-vs-rest-choosing-the-right-api-design-for-modern-web-applications/)
- [tRPC vs. GraphQL: Which is better for your projects?](https://blog.logrocket.com/trpc-vs-graphql-better-projects/)

### Forms:
- [The best React form libraries of 2026](https://blog.croct.com/post/best-react-form-libraries)
- [TanStack Form vs. React Hook Form – Which One Should You Use?](https://peerlist.io/saxenashikhil/articles/tanstack-form-vs-react-hook-form--which-one-should-you-use)
- [React Hook Form vs Formik - Comparing the most popular React form libraries](https://refine.dev/blog/react-hook-form-vs-formik/)

### UI Components:
- [Starting a React Project? shadcn/ui, Radix, and Base UI Explained](https://certificates.dev/blog/starting-a-react-project-shadcnui-radix-and-base-ui-explained)
- [15 Best React UI Libraries for 2026](https://www.builder.io/blog/react-component-libraries-2026)
- [React UI libraries in 2025: Comparing shadcn/ui, Radix, Mantine, MUI, Chakra & more](https://makersden.io/blog/react-ui-libs-2025-comparing-shadcn-radix-mantine-mui-chakra)
- [What is the difference between Radix and shadcn-ui?](https://workos.com/blog/what-is-the-difference-between-radix-and-shadcn-ui)

---

## Version History

- **1.0.0** (2026-01-26): Initial guide with 6 component categories, 18 options total
