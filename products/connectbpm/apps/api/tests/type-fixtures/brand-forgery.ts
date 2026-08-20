/**
 * TYPE-LEVEL GATE — "does not compile" is asserted, not asserted about.
 *                                              ADR-004 §2 · T015 · AC-051
 *
 * AC-051 requires that a data-access function written without a tenant
 * predicate "does not compile". A runtime test cannot prove that, and a lint
 * rule cannot either. This file proves it with the type checker that CI already
 * runs: every `@ts-expect-error` below FAILS THE BUILD if the error it expects
 * ever stops occurring. Weakening the brand therefore turns `pnpm typecheck`
 * red — there is nothing to remember to run.
 *
 * It is compiled (tsconfig.check.json includes tests/) and never executed.
 */
import type { PrismaClient } from '@prisma/client';
import type { TenantScopedClient } from '../../src/tenancy';

declare const raw: PrismaClient;
declare const scoped: TenantScopedClient;

/** A repository signature, as every downstream agent must write it. */
declare function listDefinitions(db: TenantScopedClient): Promise<unknown>;

// The raw client is NOT accepted where a scoped one is required. This single
// line is what makes "reaching for fastify.prisma" a compile error rather than
// a review comment.
// @ts-expect-error AC-051: PrismaClient is not assignable to TenantScopedClient
void listDefinitions(raw);

// A single assertion cannot manufacture the brand either: the unique symbol is
// not exported from src/tenancy/with-tenant.ts, so no other module can name the
// property key and the two types do not sufficiently overlap.
// @ts-expect-error AC-051: PrismaClient cannot be asserted into TenantScopedClient
void listDefinitions(raw as TenantScopedClient);

// Nor can it be built structurally — the key is unnameable outside the module.
// @ts-expect-error AC-051: an object literal cannot satisfy the brand
void listDefinitions({ ...raw, __brand: true } as TenantScopedClient);

// The genuine article, from withTenant, is accepted.
void listDefinitions(scoped);
