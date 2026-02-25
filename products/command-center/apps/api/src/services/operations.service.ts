import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { repoPath } from './repo.service.js';

export interface OperationsSection {
  id: string;
  title: string;
  icon: string;
  content: string;
}

export interface OperationsGuide {
  sections: OperationsSection[];
}

/** Extract a markdown section between two headings */
function extractSection(content: string, heading: string): string {
  const regex = new RegExp(
    `^#{1,3}\\s+${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`,
    'mi',
  );
  const match = regex.exec(content);
  if (!match) return '';

  const startIndex = match.index + match[0].length;
  const rest = content.slice(startIndex);

  // Find the next heading at the same or higher level
  const level = match[0].match(/^(#{1,3})/)?.[1].length ?? 2;
  const nextHeading = rest.search(new RegExp(`^#{1,${level}}\\s`, 'm'));
  const sectionText = nextHeading === -1 ? rest : rest.slice(0, nextHeading);

  return sectionText.trim().slice(0, 2000);
}

function buildOrchestratorSection(): OperationsSection {
  const orchPath = repoPath('.claude', 'orchestrator', 'orchestrator-enhanced.md');
  let content = '';

  if (existsSync(orchPath)) {
    const raw = readFileSync(orchPath, 'utf-8');
    const quickStart = extractSection(raw, 'Quick Start');
    const corePrinciples = extractSection(raw, 'Core Principles');
    content = [
      quickStart ? `### Quick Start\n\n${quickStart}` : '',
      corePrinciples ? `### Core Principles\n\n${corePrinciples}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  if (!content) {
    content =
      'The Orchestrator is the central agent that interprets CEO requests, ' +
      'delegates to specialist agents, monitors progress, and reports at checkpoints.';
  }

  return { id: 'orchestrator', title: 'Orchestrator', icon: '\ud83d\udd04', content };
}

function buildCommandsSection(): OperationsSection {
  const content = `| Command | Agent | Purpose |
|---------|-------|---------|
| \`/orchestrator\` | Orchestrator | Route CEO requests to agents |
| \`/speckit.specify\` | Product Manager | Create feature specs from briefs |
| \`/speckit.clarify\` | Product Manager | Resolve spec ambiguities |
| \`/speckit.plan\` | Architect | Create implementation plans |
| \`/speckit.tasks\` | Orchestrator | Generate task lists |
| \`/speckit.analyze\` | QA Engineer | Validate spec/plan/tasks consistency |
| \`/speckit.checklist\` | QA Engineer | Generate quality checklists |
| \`/speckit.implement\` | Orchestrator | Execute tasks via agents |
| \`/audit [product]\` | QA Engineer | Run quality audit |
| \`/status\` | Orchestrator | Get status update |`;

  return { id: 'commands', title: 'Available Commands', icon: '\u2328\ufe0f', content };
}

function buildGitSafetySection(): OperationsSection {
  const claudeMdPath = repoPath('.claude', 'CLAUDE.md');
  let content = '';

  if (existsSync(claudeMdPath)) {
    const raw = readFileSync(claudeMdPath, 'utf-8');
    content = extractSection(raw, 'Git Safety Rules \\(MANDATORY\\)');
  }

  if (!content) {
    content = `1. **Verify base branch** before creating a new branch
2. **Never use \`git add .\`** or \`git add -A\` -- always stage specific files
3. **Verify staged files** before every commit (\`git diff --cached --stat\`)
4. **Verify after every commit** (\`git show --stat\`)
5. **Pre-commit hook** blocks >30 files or >5000 deleted lines`;
  }

  return { id: 'git-safety', title: 'Git Safety Rules', icon: '\ud83d\udd12', content };
}

function buildQualityGatesSection(): OperationsSection {
  const gatePath = repoPath('.claude', 'quality-gates', 'multi-gate-system.md');
  let content = '';

  if (existsSync(gatePath)) {
    const raw = readFileSync(gatePath, 'utf-8');
    // Extract purpose and the six gates overview
    const purpose = extractSection(raw, 'Purpose');
    content = purpose
      ? `${purpose}\n\n**Six Gates**: Spec Consistency > Browser > Security > Performance > Testing > Production`
      : '';
  }

  if (!content) {
    content = `Quality is verified at multiple stages:

1. **Spec Consistency Gate** - Validates spec/plan/tasks alignment
2. **Browser-First Gate** - Product works in a real browser
3. **Security Gate** - No vulnerabilities, no exposed secrets
4. **Performance Gate** - Lighthouse >= 90, bundle < 500KB
5. **Testing Gate** - All tests pass, coverage >= 80%
6. **Production Gate** - Health checks, monitoring, rollback plan

All gates must score >= 8/10 before CEO delivery.`;
  }

  return { id: 'quality-gates', title: 'Quality Gates', icon: '\u2705', content };
}

function buildProductStructureSection(): OperationsSection {
  const content = `\`\`\`
products/[name]/
\u251c\u2500\u2500 apps/
\u2502   \u251c\u2500\u2500 api/             # Backend service
\u2502   \u2502   \u251c\u2500\u2500 src/
\u2502   \u2502   \u251c\u2500\u2500 tests/
\u2502   \u2502   \u2514\u2500\u2500 package.json
\u2502   \u2514\u2500\u2500 web/             # Frontend app
\u2502       \u251c\u2500\u2500 src/
\u2502       \u251c\u2500\u2500 tests/
\u2502       \u2514\u2500\u2500 package.json
\u251c\u2500\u2500 packages/            # Product-specific shared code
\u251c\u2500\u2500 e2e/                 # End-to-end tests
\u251c\u2500\u2500 docs/
\u2502   \u251c\u2500\u2500 PRD.md
\u2502   \u251c\u2500\u2500 API.md
\u2502   \u251c\u2500\u2500 ADRs/
\u2502   \u251c\u2500\u2500 specs/
\u2502   \u2514\u2500\u2500 quality-reports/
\u251c\u2500\u2500 package.json
\u2514\u2500\u2500 README.md
\`\`\``;

  return { id: 'product-structure', title: 'Product Structure', icon: '\ud83d\udcc1', content };
}

function buildTechStackSection(): OperationsSection {
  const content = `| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js 20+ |
| **Language** | TypeScript 5+ |
| **Backend** | Fastify |
| **Frontend** | Next.js 14+ with React 18+ |
| **Database** | PostgreSQL 15+ |
| **ORM** | Prisma |
| **Styling** | Tailwind CSS |
| **Testing** | Jest, React Testing Library, Playwright |
| **CI/CD** | GitHub Actions |
| **Mobile** | Expo (React Native) |`;

  return { id: 'tech-stack', title: 'Technology Stack', icon: '\ud83d\udee0\ufe0f', content };
}

function buildProtocolsSection(): OperationsSection {
  const protocolsDir = repoPath('.claude', 'protocols');
  const protocols: Array<{ title: string; summary: string; file: string }> = [];

  if (existsSync(protocolsDir)) {
    const files = readdirSync(protocolsDir).filter(
      (f) => f.endsWith('.md') || f.endsWith('.yml'),
    );

    for (const file of files.sort()) {
      try {
        const raw = readFileSync(join(protocolsDir, file), 'utf-8');
        // Extract title: first # heading or first non-empty line
        const titleMatch = raw.match(/^#\s+(.+)$/m);
        const title = titleMatch
          ? titleMatch[1].trim()
          : file.replace(/\.(md|yml)$/, '').replace(/-/g, ' ');

        // Extract first meaningful paragraph (after any heading, skip blank lines)
        const lines = raw.split('\n');
        let summary = '';
        let pastHeader = false;
        for (const line of lines) {
          const trimmed = line.trim();
          if (!pastHeader && trimmed.startsWith('#')) {
            pastHeader = true;
            continue;
          }
          if (pastHeader && trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('**')) {
            summary = trimmed.slice(0, 200);
            break;
          }
        }

        protocols.push({ title, summary, file });
      } catch { /* skip unreadable files */ }
    }
  }

  const listItems = protocols
    .map((p) => `- **${p.title}**: ${p.summary || 'See protocol file for details.'}`)
    .join('\n');

  const content = protocols.length > 0
    ? `${listItems}\n\nView all protocols at the [Protocols page](/protocols).`
    : 'Protocol files not found. Check `.claude/protocols/` in the repository.';

  return { id: 'protocols', title: 'Protocols', icon: '\ud83d\udcdc', content };
}

function buildConstitutionSection(): OperationsSection {
  const content = `**Version**: v1.3.0

The ConnectSW Constitution governs all spec-kit work and agent behavior. It consists of 12 articles:

1. **Spec-First Development** — No implementation without an approved spec
2. **Test-Driven Development** — Red-Green-Refactor, always
3. **Real Databases, No Mocks** — Tests use real PostgreSQL, not mocks
4. **80% Coverage Minimum** — Every product must maintain 80%+ test coverage
5. **Documentation as Deliverable** — Docs are first-class, not an afterthought
6. **Diagram-First Communication** — If it can be a diagram, it must be a diagram
7. **Git Safety** — Never \`git add .\`; always stage specific files; verify before commit
8. **Quality Gates** — All six gates must pass before CEO delivery
9. **Port Registry** — All products use unique, registered ports
10. **Component Reuse** — Check COMPONENT-REGISTRY.md before building anything new
11. **Anti-Rationalization** — The 1% Rule: if a quality step might apply, invoke it
12. **Verification Before Completion** — No task is done without evidence

The constitution is located at \`.specify/memory/constitution.md\`.`;

  return { id: 'constitution', title: 'Constitution', icon: '\ud83d\udcdc', content };
}

function buildSpecKitSection(): OperationsSection {
  const content = `Spec-kit is ConnectSW's specification-driven development methodology. All product and feature work follows a structured **spec \u2192 plan \u2192 tasks \u2192 implement** pipeline.

| Command | Agent | Purpose |
|---------|-------|---------|
| \`/speckit.specify\` | Product Manager | Create structured specs from CEO briefs |
| \`/speckit.clarify\` | Product Manager | Resolve spec ambiguities (up to 5 questions) |
| \`/speckit.plan\` | Architect | Create traceable implementation plans from specs |
| \`/speckit.tasks\` | Orchestrator | Generate dependency-ordered task lists from plans |
| \`/speckit.analyze\` | QA Engineer | Validate spec/plan/tasks consistency (quality gate) |
| \`/speckit.checklist\` | QA Engineer | Generate requirements-quality checklists |
| \`/speckit.constitution\` | Orchestrator | Update governing principles |
| \`/speckit.implement\` | Orchestrator | Execute tasks via specialist agents |

**Mandatory for new products**: BA-01, SPEC-01, CLARIFY-01, ANALYZE-01

**Mandatory for new features**: SPEC-{ID} and ANALYZE-{ID}

Key files:
- \`.specify/memory/constitution.md\` — Governing principles (12 articles, v1.3.0)
- \`.specify/templates/\` — Spec, plan, tasks, checklist templates
- \`products/[product]/docs/specs/\` — Feature specifications
- \`products/[product]/docs/plan.md\` — Implementation plans
- \`products/[product]/docs/tasks.md\` — Task lists`;

  return { id: 'spec-kit', title: 'Spec-Kit Commands', icon: '\ud83d\udee0\ufe0f', content };
}

/** Build the complete operations guide */
export function getOperationsGuide(): OperationsGuide {
  return {
    sections: [
      buildOrchestratorSection(),
      buildCommandsSection(),
      buildProtocolsSection(),
      buildConstitutionSection(),
      buildSpecKitSection(),
      buildGitSafetySection(),
      buildQualityGatesSection(),
      buildProductStructureSection(),
      buildTechStackSection(),
    ],
  };
}
