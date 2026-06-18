/**
 * dependency-cruiser configuration — Composable Credit OS API.
 *
 * Enforces the ADR-001 modular-monolith boundary rules across the 13
 * `src/modules/<module>/` directories. CI (Article XIII) fails the build on:
 *
 *  1. Importing a module's internals — siblings may import only `<module>/index.ts`
 *     (the published module contract, ADR-001 rule 2).
 *  2. Importing another module's `repository/` — persistence is encapsulated;
 *     cross-module reads go through the module contract (ADR-001 rule 3).
 *  3. Any cyclic dependency — the module graph is acyclic (ADR-001 rule 4).
 *  4. `kernel/` importing a module — the kernel is the base layer; it never
 *     depends upward.
 *
 * Phase 0: no modules exist yet, so `depcruise src` passes cleanly. The rules
 * activate as the 13 modules land in Phases 1-5.
 */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      comment: 'ADR-001 rule 4 — the module dependency graph must be acyclic.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'module-internals-private',
      comment:
        'ADR-001 rule 2 — a module may import another module only via its ' +
        'published index.ts contract, never its internal files.',
      severity: 'error',
      from: { path: '^src/modules/([^/]+)/' },
      to: {
        path: '^src/modules/([^/]+)/.+',
        pathNot: [
          '^src/modules/$1/', // own internals are fine
          '^src/modules/[^/]+/index\\.ts$', // sibling's contract is fine
        ],
      },
    },
    {
      name: 'no-cross-module-repository',
      comment:
        'ADR-001 rule 3 — a module repository touches only its own tables; ' +
        'no module may import another module\'s repository directory.',
      severity: 'error',
      from: { path: '^src/modules/([^/]+)/' },
      to: { path: '^src/modules/(?!$1/)[^/]+/repository/' },
    },
    {
      name: 'kernel-never-imports-modules',
      comment:
        'ADR-001 rule 4 — the shared kernel is the base layer and must never ' +
        'depend on a module.',
      severity: 'error',
      from: { path: '^src/kernel/' },
      to: { path: '^src/modules/' },
    },
    {
      name: 'no-orphans',
      comment: 'Unreferenced modules usually indicate dead code.',
      severity: 'warn',
      from: {
        orphan: true,
        pathNot: [
          '\\.d\\.ts$',
          '(^|/)tsconfig\\.json$',
          '(^|/)(server|app)\\.ts$',
          '(^|/)index\\.ts$',
        ],
      },
      to: {},
    },
    {
      name: 'not-to-dev-dep',
      comment: 'Production code must not import devDependencies.',
      severity: 'error',
      from: { path: '^src', pathNot: '\\.(test|spec)\\.ts$' },
      to: { dependencyTypes: ['npm-dev'] },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
    },
  },
};
