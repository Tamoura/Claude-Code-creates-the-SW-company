/**
 * helpers/db.ts — Database reset and cleanup helpers for E2E tests
 *
 * Uses the API's health/admin endpoints where possible.
 * For direct DB access, uses environment-configured DATABASE_URL.
 *
 * NOTE: Direct DB access requires the pg package. For foundation tests
 * we use API-based cleanup only. Direct DB helpers are stubs to be
 * filled in when test-specific DB reset endpoints are added.
 */

import { APIRequestContext } from '@playwright/test';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:5014';

/**
 * Check API health — returns true if the backend is healthy.
 */
export async function checkApiHealth(
  request: APIRequestContext
): Promise<{ healthy: boolean; status: string }> {
  try {
    const res = await request.get(`${API_BASE}/health`);
    if (!res.ok()) {
      return { healthy: false, status: `HTTP ${res.status()}` };
    }
    const body = await res.json() as { status: string };
    return {
      healthy: body.status === 'ok' || body.status === 'healthy',
      status: body.status,
    };
  } catch (err) {
    return { healthy: false, status: String(err) };
  }
}

/**
 * Delete a test user by email via the API.
 * Requires a superuser/admin token passed as bearer token.
 *
 * This is a stub — implement when the admin/test-cleanup endpoint is built.
 */
export async function deleteTestUserByEmail(
  request: APIRequestContext,
  email: string,
  adminToken: string
): Promise<void> {
  // Stub: will call DELETE /api/v1/admin/users?email=... when implemented
  // For now, test users are cleaned up by the database reset in CI
  console.log(`[db.ts] deleteTestUserByEmail stub: ${email} (token: ${adminToken.substring(0, 8)}...)`);
}

/**
 * Reset test data for E2E tests.
 * In CI: database is reset between test runs via migration reset.
 * In local dev: use this to clean up e2e- prefixed test accounts.
 *
 * This is a stub — full implementation requires a test-reset API endpoint
 * or direct DB access via pg client.
 */
export async function resetE2ETestData(
  _request: APIRequestContext
): Promise<void> {
  // Stub: implement when test reset endpoint or direct DB access is set up
  // Pattern: DELETE FROM users WHERE email LIKE 'e2e-test-%@example.com'
  console.log('[db.ts] resetE2ETestData: stub — not yet implemented');
}
