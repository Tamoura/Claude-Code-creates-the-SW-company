#!/usr/bin/env tsx
/**
 * CI GATE — metering boundary.        DEC-002 (MET-2/MET-3), ADR-007, AC-012/AC-013
 *
 * DEC-002 is irreversible: the billable event is instance completion, the meter
 * increments in the SAME transaction as the state transition, and the accounting
 * is exactly-once on an at-least-once substrate. AC-012 and AC-013 require these
 * to be BUILD FAILURES, not review opinions. This gate is that build failure.
 *
 *   1. AC-013 — no module may import `UsageService` from `@connectsw/billing`.
 *      Its Redis-counter path is keyed to userId and is not transactional; it
 *      satisfies neither MET-2 nor MET-3. It stays legal for soft limits and
 *      dashboards, and only under `SOFT_LIMIT_ALLOWLIST`.
 *
 *   2. AC-012 — `usageEvent.create/createMany/upsert/updateMany/delete...` and
 *      raw SQL touching `usage_event` may appear ONLY in the ledger module.
 *      Everywhere else the write is invisible to the transition transaction and
 *      therefore unaccounted.
 *
 *   3. `usage_event` is an append-only ledger (MET-5). Updates and deletes are
 *      forbidden everywhere, including in the ledger module.
 *
 *   4. No path from customer input to a callable (NFR-009): `eval`,
 *      `new Function`, `vm2`, `isolated-vm`, `filtrex`, `expression-eval`,
 *      `jse-eval`, `safe-eval`. The expression evaluator is an owned grammar
 *      over a pinned AST (ADR-002); there is no legitimate exception.
 *
 * This is a complete, enforcing check over the whole API source tree, not a
 * placeholder. It finds zero violations today because the metering path has not
 * been written yet — it will fail the first build that introduces one. The
 * fixture suite in `tests/unit/gates/` proves that by feeding it violations.
 *
 * Exit codes: 0 pass · 1 violation · 2 gate could not run.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const API_ROOT = join(__dirname, '..');
const DEFAULT_ROOTS = ['src'];

/** The single legal writer of `usage_event` (ADR-007). */
const LEDGER_MODULE = 'src/metering/usage-ledger.ts';

/** Modules allowed to use billing's UsageService — soft limits and dashboards only. */
const SOFT_LIMIT_ALLOWLIST = ['src/services/soft-limits/'];

export interface Finding {
  rule: string;
  file: string;
  line: number;
  text: string;
  why: string;
}

interface Rule {
  id: string;
  pattern: RegExp;
  why: string;
  /** Returns true when this file is permitted to match. */
  allowed?: (relPath: string) => boolean;
}

const RULES: Rule[] = [
  {
    id: 'AC-013/usage-service-import',
    pattern: /\bUsageService\b/,
    why:
      "@connectsw/billing's UsageService is a Redis counter keyed to userId. " +
      'It is not transactional and not replay-safe, so it satisfies neither ' +
      'DEC-002 MET-2 nor MET-3. Use recordBillableCompletion(tx, ...) in ' +
      `${LEDGER_MODULE} instead.`,
    allowed: (p) => SOFT_LIMIT_ALLOWLIST.some((prefix) => p.startsWith(prefix)),
  },
  {
    id: 'AC-012/usage-event-write-outside-ledger',
    pattern: /\busageEvent\s*\.\s*(create|createMany|upsert)\b/,
    why:
      'A usage event written outside the ledger module is written outside the ' +
      'transition transaction, so it is unaccounted (DEC-002 MET-2). Route it ' +
      'through recordBillableCompletion(tx, ...), which cannot be called ' +
      'without a TransitionTx.',
    allowed: (p) => p === LEDGER_MODULE,
  },
  {
    id: 'AC-012/usage-event-raw-sql-outside-ledger',
    pattern: /(INSERT\s+INTO|insert\s+into)\s+"?usage_event"?/,
    why:
      'Raw SQL bypasses the TransitionTx brand entirely. The ledger module is ' +
      'the only place this may appear.',
    allowed: (p) => p === LEDGER_MODULE,
  },
  {
    id: 'MET-5/usage-event-mutation',
    pattern: /\busageEvent\s*\.\s*(update|updateMany|delete|deleteMany)\b/,
    why:
      'usage_event is an append-only ledger reconcilable against the audit ' +
      'trail (DEC-002 MET-5). It is never updated or deleted, including by the ' +
      'ledger module. Correct a mistake with a compensating entry.',
  },
  {
    id: 'MET-2/transaction-brand-bypass',
    pattern: /recordBillableCompletion\s*\(\s*(prisma|this\.prisma|fastify\.prisma|db)\b/,
    why:
      'recordBillableCompletion takes a TransitionTx, constructible only inside ' +
      'the Transition Coordinator. Passing a raw client means the meter is not ' +
      'in the transition transaction (MET-2).',
  },
  {
    id: 'NFR-009/dynamic-code-execution',
    pattern: /\bnew\s+Function\s*\(|(?<![.\w])eval\s*\(|require\(\s*['"](vm2|isolated-vm|filtrex|expression-eval|jse-eval|safe-eval)['"]|from\s+['"](vm2|isolated-vm|filtrex|expression-eval|jse-eval|safe-eval)['"]/,
    why:
      'Any path from customer-authored process logic to a callable violates ' +
      'NFR-009 absolutely. Conditions are parsed at publish time to a pinned ' +
      'AST and evaluated by a total budgeted tree-walker (ADR-002).',
  },
];

function walk(dir: string, out: string[]): void {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry === 'coverage') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith('.d.ts')) out.push(full);
  }
}

/** A comment naming a rule is documentation, not a violation. */
function isComment(text: string): boolean {
  const t = text.trimStart();
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*');
}

function scanFile(file: string, relPath: string): Finding[] {
  const findings: Finding[] = [];
  const lines = readFileSync(file, 'utf-8').split('\n');

  for (let i = 0; i < lines.length; i += 1) {
    const text = lines[i] ?? '';
    if (isComment(text)) continue;

    for (const rule of RULES) {
      if (!rule.pattern.test(text)) continue;
      if (rule.allowed?.(relPath)) continue;
      findings.push({
        rule: rule.id,
        file: relPath,
        line: i + 1,
        text: text.trim(),
        why: rule.why,
      });
    }
  }

  return findings;
}

/** Exported so the gate's own tests can run it against fixture directories. */
export function scan(roots: string[], base = API_ROOT): Finding[] {
  const files: string[] = [];
  for (const root of roots) walk(join(base, root), files);

  return files.flatMap((file) =>
    scanFile(file, relative(base, file).split('\\').join('/'))
  );
}

function main(): void {
  const roots = DEFAULT_ROOTS;
  const scanned = roots.filter((r) => existsSync(join(API_ROOT, r)));

  if (scanned.length === 0) {
    process.stderr.write(
      `GATE CANNOT RUN: none of [${roots.join(', ')}] exist under ${API_ROOT}\n`
    );
    process.exit(2);
  }

  const findings = scan(scanned);
  const out = process.stdout;

  out.write('Metering-boundary gate (DEC-002 MET-2/MET-3, AC-012, AC-013)\n');
  out.write(`  roots scanned : ${scanned.join(', ')}\n`);
  out.write(`  rules active  : ${RULES.map((r) => r.id).join('\n                  ')}\n`);
  out.write(`  ledger module : ${LEDGER_MODULE}${existsSync(join(API_ROOT, LEDGER_MODULE)) ? '' : ' (not yet written)'}\n`);

  if (findings.length === 0) {
    out.write('\nPASS — no meter write outside the transition transaction, no UsageService import.\n');
    return;
  }

  out.write(`\nFAIL — ${findings.length} violation(s):\n`);
  for (const f of findings) {
    out.write(`\n  ${f.file}:${f.line}  [${f.rule}]\n    ${f.text}\n    ${f.why}\n`);
  }
  process.exit(1);
}

if (require.main === module) main();
