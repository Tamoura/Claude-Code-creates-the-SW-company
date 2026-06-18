/**
 * In-process domain-event bus — ADR-001 boundary rule 6.
 *
 * Modules emit domain events (`RuleSetPublished`, `IntegrityRunFailed`,
 * `BundleReleased`, ...). The `audit` and `notification` modules subscribe.
 * The bus is the future message-broker seam — when a module is extracted
 * to its own service, the bus becomes a broker without touching callers.
 *
 * Phase 0: type contract only — no implementation yet.
 */

import type { TenantContext } from './tenant-context.js';

/**
 * The closed set of domain event names emitted across the platform.
 * Extended phase by phase as modules land.
 */
export type DomainEventName =
  | 'ObjectCreated'
  | 'ObjectUpdated'
  | 'ObjectPublished'
  | 'ObjectApproved'
  | 'RuleSetPublished'
  | 'IntegrityRunCompleted'
  | 'IntegrityRunFailed'
  | 'BundleReleased'
  | 'BundleRolledBack'
  | 'ConnectorInvoked'
  | 'RuntimeCaseAdvanced'
  | 'ActionFailed';

/**
 * A domain event. `payload` is intentionally a typed-per-event open record;
 * concrete payload shapes are defined by each emitting module's contract.
 */
export interface DomainEvent<TPayload = Readonly<Record<string, unknown>>> {
  readonly name: DomainEventName;
  /** The tenant + actor context the event was emitted under. */
  readonly context: TenantContext;
  /** Event-specific data — shape owned by the emitting module. */
  readonly payload: TPayload;
  /** When the event was emitted. */
  readonly occurredAt: Date;
}

/** A subscriber callback. May be async; the bus awaits all handlers. */
export type DomainEventHandler<TPayload = Readonly<Record<string, unknown>>> = (
  event: DomainEvent<TPayload>,
) => void | Promise<void>;

/** Unsubscribes a previously registered handler. */
export type Unsubscribe = () => void;

/**
 * The in-process event bus contract. Injected as a Fastify decorator so no
 * module imports another module to communicate (ADR-001 rule 5).
 */
export interface EventBus {
  /** Emit an event to all subscribers; resolves once every handler settles. */
  emit(event: DomainEvent): Promise<void>;
  /** Subscribe to one event name. Returns an unsubscribe handle. */
  on(name: DomainEventName, handler: DomainEventHandler): Unsubscribe;
  /** Subscribe to every event (used by `audit`). Returns an unsubscribe handle. */
  onAny(handler: DomainEventHandler): Unsubscribe;
}
