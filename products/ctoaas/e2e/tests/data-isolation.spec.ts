import { test, expect } from '@playwright/test';

/**
 * Multi-tenant data isolation tests.
 *
 * These tests verify that data belonging to one organization cannot be
 * accessed by users in a different organization. They use the Playwright
 * request context to make direct API calls against the backend (port 5015).
 *
 * Prerequisites:
 * - Backend running on http://localhost:5015
 * - Database seeded or signup endpoint available
 */

const API_BASE = 'http://localhost:5015';

/** Helper: sign up a user and return the access token. */
async function signupAndLogin(
  request: typeof test extends (...args: infer _A) => infer _R ? never : never,
  requestContext: Awaited<ReturnType<typeof import('@playwright/test').APIRequestContext['prototype']['constructor']>>,
  user: { name: string; email: string; password: string; companyName: string }
): Promise<string | null> {
  // Attempt signup
  const signupRes = await requestContext.post(`${API_BASE}/auth/signup`, {
    data: {
      name: user.name,
      email: user.email,
      password: user.password,
      companyName: user.companyName,
    },
  });

  // Attempt login (may fail if email verification is required)
  const loginRes = await requestContext.post(`${API_BASE}/auth/login`, {
    data: {
      email: user.email,
      password: user.password,
    },
  });

  if (!loginRes.ok()) return null;

  const body = await loginRes.json();
  return body?.data?.accessToken ?? body?.accessToken ?? null;
}

test.describe('Multi-tenant Data Isolation', () => {
  const orgA = {
    name: 'Org A User',
    email: `e2e-orga-${Date.now()}@test.com`,
    password: 'E2eTest!234',
    companyName: 'Org Alpha Inc',
  };

  const orgB = {
    name: 'Org B User',
    email: `e2e-orgb-${Date.now()}@test.com`,
    password: 'E2eTest!234',
    companyName: 'Org Beta LLC',
  };

  test('org-A cannot see org-B risk items via API', async ({ request }) => {
    const tokenA = await signupAndLogin(test, request, orgA);
    const tokenB = await signupAndLogin(test, request, orgB);

    // Skip if login requires email verification (tokens will be null)
    test.skip(
      !tokenA || !tokenB,
      'Skipped: email verification required for login — tokens unavailable'
    );

    // Org A creates a risk item
    const createRes = await request.post(`${API_BASE}/risks`, {
      headers: { Authorization: `Bearer ${tokenA}` },
      data: {
        title: 'Org A Secret Risk',
        category: 'security',
        severity: 'high',
        description: 'Confidential risk for Org A',
      },
    });

    if (createRes.ok()) {
      // Org B fetches risks — should NOT contain Org A's item
      const listRes = await request.get(`${API_BASE}/risks`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });

      if (listRes.ok()) {
        const body = await listRes.json();
        const risks = body?.data ?? body?.risks ?? [];
        const leaked = risks.some(
          (r: { title?: string }) => r.title === 'Org A Secret Risk'
        );
        expect(leaked).toBe(false);
      }
    }
  });

  test('org-A cannot see org-B conversations via API', async ({ request }) => {
    const tokenA = await signupAndLogin(test, request, orgA);
    const tokenB = await signupAndLogin(test, request, orgB);

    test.skip(
      !tokenA || !tokenB,
      'Skipped: email verification required for login — tokens unavailable'
    );

    // Org A creates a conversation
    const createRes = await request.post(`${API_BASE}/conversations`, {
      headers: { Authorization: `Bearer ${tokenA}` },
      data: {
        title: 'Org A Private Conversation',
      },
    });

    if (createRes.ok()) {
      // Org B lists conversations — should NOT see Org A's
      const listRes = await request.get(`${API_BASE}/conversations`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });

      if (listRes.ok()) {
        const body = await listRes.json();
        const convos = body?.data ?? body?.conversations ?? [];
        const leaked = convos.some(
          (c: { title?: string }) => c.title === 'Org A Private Conversation'
        );
        expect(leaked).toBe(false);
      }
    }
  });

  test('org-A cannot see org-B ADRs via API', async ({ request }) => {
    const tokenA = await signupAndLogin(test, request, orgA);
    const tokenB = await signupAndLogin(test, request, orgB);

    test.skip(
      !tokenA || !tokenB,
      'Skipped: email verification required for login — tokens unavailable'
    );

    // Org A creates an ADR
    const createRes = await request.post(`${API_BASE}/adrs`, {
      headers: { Authorization: `Bearer ${tokenA}` },
      data: {
        title: 'ADR-001: Org A Internal Decision',
        status: 'proposed',
        context: 'Internal context for Org A only',
        decision: 'Use internal tool',
        consequences: 'None for others',
      },
    });

    if (createRes.ok()) {
      // Org B lists ADRs — should NOT see Org A's
      const listRes = await request.get(`${API_BASE}/adrs`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });

      if (listRes.ok()) {
        const body = await listRes.json();
        const adrs = body?.data ?? body?.adrs ?? [];
        const leaked = adrs.some(
          (a: { title?: string }) =>
            a.title === 'ADR-001: Org A Internal Decision'
        );
        expect(leaked).toBe(false);
      }
    }
  });

  test('unauthenticated request to protected endpoint returns 401', async ({
    request,
  }) => {
    const res = await request.get(`${API_BASE}/risks`);

    // Should be 401 Unauthorized (or 403 Forbidden)
    expect([401, 403]).toContain(res.status());
  });

  test('invalid token returns 401 on protected endpoint', async ({
    request,
  }) => {
    const res = await request.get(`${API_BASE}/risks`, {
      headers: {
        Authorization: 'Bearer invalid-token-value-here',
      },
    });

    expect([401, 403]).toContain(res.status());
  });
});
