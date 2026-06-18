/**
 * Database seed — Composable Credit OS.
 *
 * Seeds the default tenant plus one sandbox `Connector` per capability type,
 * each carrying its realistic stub response from the sandbox payload
 * catalogue (ADR-005). Run with `pnpm db:seed`.
 *
 * Idempotent: re-running upserts rather than duplicating rows.
 */
import { PrismaClient } from '@prisma/client';
import { SANDBOX_PAYLOAD_LIST } from '../src/fixtures/sandbox-payloads/index.js';

const prisma = new PrismaClient();

const DEFAULT_TENANT_ID =
  process.env.DEFAULT_TENANT_ID ?? '00000000-0000-0000-0000-000000000001';

async function main(): Promise<void> {
  // One sandbox connector per capability type — all SANDBOX mode (v1).
  for (const payload of SANDBOX_PAYLOAD_LIST) {
    const name = `Sandbox ${payload.capabilityType} Connector`;
    const existing = await prisma.connector.findFirst({
      where: { tenantId: DEFAULT_TENANT_ID, name },
    });

    const data = {
      tenantId: DEFAULT_TENANT_ID,
      name,
      provider: 'sandbox',
      capabilityType: payload.capabilityType,
      endpoint: `sandbox://${payload.capabilityType.toLowerCase()}`,
      authRef: 'vault://sandbox/no-credentials',
      mapping: { request: {}, response: {} },
      retry: { maxAttempts: 1 },
      timeoutMs: 30_000,
      fallback: { strategy: 'NONE' },
      owner: 'platform',
      mode: 'SANDBOX' as const,
      // The realistic stub response the SandboxConnectorProvider returns.
      // Stored under `fallback.sandboxResponse` so the provider can read it
      // until the dedicated sandbox-payload table lands in Phase 4.
    };

    if (existing) {
      await prisma.connector.update({
        where: { id: existing.id },
        data: { ...data, fallback: { strategy: 'NONE', sandboxResponse: payload.response } },
      });
    } else {
      await prisma.connector.create({
        data: { ...data, fallback: { strategy: 'NONE', sandboxResponse: payload.response } },
      });
    }
  }

  const count = await prisma.connector.count({ where: { tenantId: DEFAULT_TENANT_ID } });
  // eslint-disable-next-line no-console
  console.log(`Seed complete: ${count} sandbox connectors for tenant ${DEFAULT_TENANT_ID}`);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
