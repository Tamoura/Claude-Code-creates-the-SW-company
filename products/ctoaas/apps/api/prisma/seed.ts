/**
 * CTOaaS Database Seed
 *
 * Seeds the tech_radar_items table with 30+ technologies.
 * Uses upsert for idempotency — safe to run multiple times.
 *
 * Run: npx prisma db seed
 */

import { PrismaClient, RadarQuadrant, RadarRing } from '@prisma/client';

const prisma = new PrismaClient();

interface TechRadarSeed {
  name: string;
  quadrant: RadarQuadrant;
  ring: RadarRing;
  description: string;
  rationale: string;
  isNew: boolean;
}

const techRadarItems: TechRadarSeed[] = [
  // ── Languages & Frameworks ──────────────────────────────────
  {
    name: 'TypeScript',
    quadrant: RadarQuadrant.LANGUAGES_FRAMEWORKS,
    ring: RadarRing.ADOPT,
    description:
      'Typed superset of JavaScript for both frontend and backend development.',
    rationale:
      'Production-proven across all ConnectSW products. Type safety prevents entire class of runtime errors. Excellent tooling ecosystem.',
    isNew: false,
  },
  {
    name: 'Rust',
    quadrant: RadarQuadrant.LANGUAGES_FRAMEWORKS,
    ring: RadarRing.TRIAL,
    description:
      'Systems programming language focused on safety, speed, and concurrency.',
    rationale:
      'Growing adoption for performance-critical services. Memory safety without garbage collection. Strong in WebAssembly and infrastructure tooling.',
    isNew: false,
  },
  {
    name: 'Go',
    quadrant: RadarQuadrant.LANGUAGES_FRAMEWORKS,
    ring: RadarRing.TRIAL,
    description:
      'Simple, fast, concurrent language by Google for cloud services.',
    rationale:
      'Excellent for microservices and CLI tools. Simple concurrency model. Fast compilation. Growing in cloud-native ecosystem.',
    isNew: false,
  },
  {
    name: 'Next.js',
    quadrant: RadarQuadrant.LANGUAGES_FRAMEWORKS,
    ring: RadarRing.ADOPT,
    description:
      'React framework with SSR, SSG, and App Router for full-stack web applications.',
    rationale:
      'Standard at ConnectSW. App Router provides excellent DX. Server Components reduce client bundle. Vercel ecosystem is mature.',
    isNew: false,
  },
  {
    name: 'Fastify',
    quadrant: RadarQuadrant.LANGUAGES_FRAMEWORKS,
    ring: RadarRing.ADOPT,
    description:
      'High-performance Node.js web framework with plugin architecture.',
    rationale:
      'ConnectSW default backend framework. 2x faster than Express. Excellent TypeScript support. Plugin system enables clean separation.',
    isNew: false,
  },
  {
    name: 'Svelte/SvelteKit',
    quadrant: RadarQuadrant.LANGUAGES_FRAMEWORKS,
    ring: RadarRing.ASSESS,
    description:
      'Compiler-based frontend framework with minimal runtime overhead.',
    rationale:
      'Interesting compilation approach reduces bundle size. Growing community. Worth watching for specific use cases.',
    isNew: true,
  },
  {
    name: 'Deno',
    quadrant: RadarQuadrant.LANGUAGES_FRAMEWORKS,
    ring: RadarRing.ASSESS,
    description:
      'Secure JavaScript/TypeScript runtime by Node.js creator.',
    rationale:
      'Built-in TypeScript support and security model are appealing. Ecosystem still maturing. JSR registry is promising.',
    isNew: false,
  },
  {
    name: 'React Native',
    quadrant: RadarQuadrant.LANGUAGES_FRAMEWORKS,
    ring: RadarRing.TRIAL,
    description: 'Cross-platform mobile framework using React.',
    rationale:
      'Enables code sharing between web and mobile. New Architecture improves performance. Good for teams with React expertise.',
    isNew: false,
  },

  // ── Platforms & Infrastructure ──────────────────────────────
  {
    name: 'PostgreSQL',
    quadrant: RadarQuadrant.PLATFORMS_INFRASTRUCTURE,
    ring: RadarRing.ADOPT,
    description:
      'Advanced open-source relational database with extensibility.',
    rationale:
      'ConnectSW default database. pgvector extension enables RAG. JSON support, full-text search, excellent performance.',
    isNew: false,
  },
  {
    name: 'Redis',
    quadrant: RadarQuadrant.PLATFORMS_INFRASTRUCTURE,
    ring: RadarRing.ADOPT,
    description:
      'In-memory data store for caching, sessions, and rate limiting.',
    rationale:
      'ConnectSW standard for caching. Simple protocol, fast, reliable. Graceful degradation pattern established.',
    isNew: false,
  },
  {
    name: 'Kubernetes',
    quadrant: RadarQuadrant.PLATFORMS_INFRASTRUCTURE,
    ring: RadarRing.ADOPT,
    description:
      'Container orchestration platform for production deployments.',
    rationale:
      'Industry standard for container orchestration. Managed offerings (EKS, GKE, AKS) reduce operational burden.',
    isNew: false,
  },
  {
    name: 'AWS',
    quadrant: RadarQuadrant.PLATFORMS_INFRASTRUCTURE,
    ring: RadarRing.ADOPT,
    description:
      'Comprehensive cloud platform with broadest service offering.',
    rationale:
      'Market leader with deepest service catalog. Strong enterprise adoption. Well-documented patterns.',
    isNew: false,
  },
  {
    name: 'Cloudflare Workers',
    quadrant: RadarQuadrant.PLATFORMS_INFRASTRUCTURE,
    ring: RadarRing.TRIAL,
    description:
      'Edge computing platform with V8 isolates for serverless functions.',
    rationale:
      'Excellent for edge caching, API gateways, and light compute. R2 for storage. Zero cold starts.',
    isNew: true,
  },
  {
    name: 'Neon',
    quadrant: RadarQuadrant.PLATFORMS_INFRASTRUCTURE,
    ring: RadarRing.TRIAL,
    description:
      'Serverless Postgres with branching and auto-scaling.',
    rationale:
      'Database branching enables per-PR preview environments. Serverless pricing model. pgvector support.',
    isNew: true,
  },
  {
    name: 'Supabase',
    quadrant: RadarQuadrant.PLATFORMS_INFRASTRUCTURE,
    ring: RadarRing.TRIAL,
    description:
      'Open-source Firebase alternative built on PostgreSQL.',
    rationale:
      'Combines Postgres with auth, storage, and real-time. Good for rapid prototyping. Self-hostable.',
    isNew: false,
  },
  {
    name: 'CockroachDB',
    quadrant: RadarQuadrant.PLATFORMS_INFRASTRUCTURE,
    ring: RadarRing.ASSESS,
    description:
      'Distributed SQL database with strong consistency and horizontal scaling.',
    rationale:
      'For globally distributed applications. PostgreSQL wire compatibility. High operational complexity.',
    isNew: false,
  },

  // ── Tools ───────────────────────────────────────────────────
  {
    name: 'CopilotKit',
    quadrant: RadarQuadrant.TOOLS,
    ring: RadarRing.ADOPT,
    description:
      'React framework for building AI copilot experiences with streaming and generative UI.',
    rationale:
      'Selected for CTOaaS. AG-UI protocol provides real-time agent reasoning visibility. Reduces custom AI UI code by 80%.',
    isNew: true,
  },
  {
    name: 'LangGraph',
    quadrant: RadarQuadrant.TOOLS,
    ring: RadarRing.ADOPT,
    description:
      'Stateful agent orchestration framework for multi-step AI workflows.',
    rationale:
      'Selected for CTOaaS. Used by Uber, LinkedIn, Replit. Durable execution, tool use, human-in-the-loop.',
    isNew: true,
  },
  {
    name: 'LlamaIndex',
    quadrant: RadarQuadrant.TOOLS,
    ring: RadarRing.ADOPT,
    description:
      'Data framework for RAG applications with document ingestion and retrieval.',
    rationale:
      'Selected for CTOaaS. TypeScript support, 40% faster than alternatives. Excellent chunking and indexing.',
    isNew: true,
  },
  {
    name: 'Prisma',
    quadrant: RadarQuadrant.TOOLS,
    ring: RadarRing.ADOPT,
    description:
      'Type-safe ORM for Node.js and TypeScript with migration management.',
    rationale:
      'ConnectSW standard ORM. Auto-generated types from schema. Excellent migration workflow.',
    isNew: false,
  },
  {
    name: 'Playwright',
    quadrant: RadarQuadrant.TOOLS,
    ring: RadarRing.ADOPT,
    description:
      'Cross-browser E2E testing framework with auto-wait and trace viewer.',
    rationale:
      'ConnectSW standard for E2E tests. Reliable, fast, excellent debugging tools.',
    isNew: false,
  },
  {
    name: 'Turborepo',
    quadrant: RadarQuadrant.TOOLS,
    ring: RadarRing.ASSESS,
    description:
      'High-performance monorepo build system by Vercel.',
    rationale:
      'Could improve CI times for ConnectSW monorepo. Remote caching is appealing. Added complexity may not justify yet.',
    isNew: false,
  },
  {
    name: 'Biome',
    quadrant: RadarQuadrant.TOOLS,
    ring: RadarRing.TRIAL,
    description:
      'Fast formatter and linter replacing ESLint + Prettier.',
    rationale:
      'Written in Rust, 10-100x faster than ESLint. Unified tool reduces config. Still maturing for plugin ecosystem.',
    isNew: true,
  },
  {
    name: 'Semgrep',
    quadrant: RadarQuadrant.TOOLS,
    ring: RadarRing.ADOPT,
    description:
      'Static analysis tool for finding security vulnerabilities.',
    rationale:
      'ConnectSW CI pipeline standard. Custom rules for OWASP checks. Low false positive rate.',
    isNew: false,
  },

  // ── Techniques ──────────────────────────────────────────────
  {
    name: 'RAG (Retrieval-Augmented Generation)',
    quadrant: RadarQuadrant.TECHNIQUES,
    ring: RadarRing.ADOPT,
    description:
      'Combining LLM generation with document retrieval for grounded responses.',
    rationale:
      'Core technique for CTOaaS. Reduces hallucination, enables source citations. Proven at scale.',
    isNew: false,
  },
  {
    name: 'ReAct Pattern',
    quadrant: RadarQuadrant.TECHNIQUES,
    ring: RadarRing.ADOPT,
    description:
      'Reasoning + Acting loop for LLM agents with tool use.',
    rationale:
      'Standard pattern for agentic AI. Agent reasons about what to do, acts (calls tools), observes results, repeats.',
    isNew: false,
  },
  {
    name: 'Agentic AI',
    quadrant: RadarQuadrant.TECHNIQUES,
    ring: RadarRing.TRIAL,
    description:
      'AI systems that autonomously plan, execute, and adapt multi-step workflows.',
    rationale:
      'Emerging paradigm beyond simple chatbots. LangGraph and CopilotKit enable production agentic systems.',
    isNew: true,
  },
  {
    name: 'Feature Flags',
    quadrant: RadarQuadrant.TECHNIQUES,
    ring: RadarRing.ADOPT,
    description:
      'Runtime feature toggling for gradual rollouts and A/B testing.',
    rationale:
      'Essential for SaaS products. Enables freemium gating, gradual feature releases, and safe experimentation.',
    isNew: false,
  },
  {
    name: 'Event Sourcing',
    quadrant: RadarQuadrant.TECHNIQUES,
    ring: RadarRing.ASSESS,
    description:
      'Storing all state changes as an append-only event log.',
    rationale:
      'Useful for audit trails and decision history tracking. Added complexity may not justify for Phase 1.',
    isNew: false,
  },
  {
    name: 'Domain-Driven Design',
    quadrant: RadarQuadrant.TECHNIQUES,
    ring: RadarRing.TRIAL,
    description:
      'Software design approach modeling complex business domains.',
    rationale:
      'Useful for CTOaaS domain modeling (risk, cost, radar). Bounded contexts help isolate complexity.',
    isNew: false,
  },
  {
    name: 'Trunk-Based Development',
    quadrant: RadarQuadrant.TECHNIQUES,
    ring: RadarRing.ADOPT,
    description:
      'Development model with short-lived feature branches merged to main frequently.',
    rationale:
      'ConnectSW standard. Reduces merge conflicts. Feature flags enable incomplete work on main.',
    isNew: false,
  },
];

async function main(): Promise<void> {
  console.log('Seeding CTOaaS database...');

  // Seed tech radar items (idempotent via upsert on unique name)
  let created = 0;
  let updated = 0;

  for (const item of techRadarItems) {
    const result = await prisma.techRadarItem.upsert({
      where: { name: item.name },
      update: {
        quadrant: item.quadrant,
        ring: item.ring,
        description: item.description,
        rationale: item.rationale,
        isNew: item.isNew,
      },
      create: {
        name: item.name,
        quadrant: item.quadrant,
        ring: item.ring,
        description: item.description,
        rationale: item.rationale,
        isNew: item.isNew,
      },
    });

    // Check if this was a create or update by comparing createdAt and updatedAt
    if (result.createdAt.getTime() === result.updatedAt.getTime()) {
      created++;
    } else {
      updated++;
    }
  }

  console.log(
    `Tech Radar: ${created} created, ${updated} updated (${techRadarItems.length} total)`
  );
  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
