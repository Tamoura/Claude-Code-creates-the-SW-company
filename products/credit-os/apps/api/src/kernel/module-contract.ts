/**
 * Module contract — ADR-001 boundary rules 2 & 3.
 *
 * Each of the 13 modules exports exactly one `index.ts` whose default export
 * conforms to `ModuleContract`. Other modules import *only* that contract —
 * never another module's `routes/`, `services/`, or `repository/`. This is
 * the encapsulation that keeps every module independently extractable.
 *
 * Phase 0: type contract only — no module implements this yet.
 */

import type { FastifyPluginAsync } from 'fastify';
import type { EventBus } from './event-bus.js';

/** The 13 logical modules (ARCHITECTURE.md §3.3). */
export type ModuleName =
  | 'data-dictionary'
  | 'audit'
  | 'product'
  | 'policy'
  | 'workflow'
  | 'form'
  | 'document'
  | 'integrity'
  | 'credit-services'
  | 'integration'
  | 'publication'
  | 'runtime'
  | 'notification';

/**
 * Dependencies the kernel injects into a module at registration time.
 * A module receives only contracts — never concrete sibling modules.
 */
export interface ModuleDependencies {
  /** The in-process domain-event bus (ADR-001 rule 6). */
  readonly eventBus: EventBus;
  /**
   * Contracts of modules this module is permitted to depend on, keyed by
   * name. The acyclic direction (ADR-001 rule 4) is enforced at wiring time
   * and by dependency-cruiser in CI.
   */
  readonly dependencies: Readonly<Partial<Record<ModuleName, ModuleContract>>>;
}

/**
 * The single published surface of a module. Sibling modules call methods on
 * the `api` object; the kernel mounts `routes` under `/api/v1`.
 */
export interface ModuleContract {
  /** Which module this is. */
  readonly name: ModuleName;
  /** Modules this one is allowed to depend on (must respect ADR-001 rule 4). */
  readonly dependsOn: readonly ModuleName[];
  /**
   * The Fastify plugin that mounts this module's HTTP routes.
   * Optional — `notification` is a pure event sink with no routes.
   */
  readonly routes?: FastifyPluginAsync;
  /**
   * The cross-module callable surface. Concrete shape is declared by each
   * module's own contract file; siblings consume the narrowed type.
   */
  readonly api: Readonly<Record<string, unknown>>;
}

/**
 * The factory every module's `index.ts` default-exports. The kernel calls it
 * once at startup with the module's injected dependencies.
 */
export type ModuleFactory = (deps: ModuleDependencies) => ModuleContract;
