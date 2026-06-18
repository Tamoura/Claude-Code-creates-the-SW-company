/**
 * Shared kernel — ADR-001.
 *
 * The kernel provides the cross-cutting primitives every module builds on:
 * tenant context, the in-process domain-event bus, and the module-contract
 * types that keep the 13 modules decoupled.
 *
 * Phase 0 scaffold: types only. The versioning base repository lands in
 * Phase 1 (T051) and is re-exported from here.
 */

export type { TenantId, ActorId, TenantContext, AuthChannel } from './tenant-context.js';
export type {
  DomainEventName,
  DomainEvent,
  DomainEventHandler,
  Unsubscribe,
  EventBus,
} from './event-bus.js';
export type {
  ModuleName,
  ModuleDependencies,
  ModuleContract,
  ModuleFactory,
} from './module-contract.js';
