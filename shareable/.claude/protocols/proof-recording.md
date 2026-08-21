# Proof Recording Protocol

## Purpose
Every feature implemented by any agent — whether frontend UI or backend API — MUST produce
a proof recording before the feature is considered complete.

## What Counts as Proof

| Feature Type | Required Proof |
|---|---|
| UI page / component | Playwright video + screenshot + trace |
| API endpoint (GET) | HTTP response JSON saved to `e2e-proof/api-proof/{endpoint}.json` |
| API endpoint (POST/PATCH/DELETE) | Request+response JSON with status code |
| Background job / service | Output log file showing execution |

## Artifact Location
All proof artifacts are stored in `products/{name}/e2e-proof/` after running:
```bash
npx playwright test   # produces videos, traces, screenshots
```

API-only proof files: `products/{name}/e2e-proof/api-proof/{endpoint-slug}.json`

## How Agents Produce Proof

### For UI features:
The `playwright.config.ts` now records video and traces for EVERY test (not just failures).
Write an E2E test for the feature. When the test passes, the video is proof.

### For API/Backend features:
Add a test to `e2e/api-proof.spec.ts` using Playwright's `request` fixture:
1. Make the HTTP request
2. Save `{ url, method, requestBody, status, responseBody, durationMs }` to a JSON file
3. Assert the expected behavior

### Packaging for sharing:
```bash
npm run proof:package   # creates e2e-proof-{timestamp}.zip
```

## Quality Gate Integration
- Testing Gate (run by QA Engineer) MUST include API proof tests
- If `e2e-proof/api-proof/` is empty after a backend feature, Testing Gate = FAIL
- Recordings are committed to PR description as artifacts (attached to GitHub PR)

## Template for New API Proof Test
```typescript
test('GET /api/v1/my-endpoint returns expected data', async ({ request }) => {
  const start = Date.now();
  const res = await request.get('http://localhost:5009/api/v1/my-endpoint');
  const body = await res.json();

  writeProof('my-endpoint', {
    url: '/api/v1/my-endpoint',
    method: 'GET',
    status: res.status(),
    body,
    durationMs: Date.now() - start,
  });

  expect(res.status()).toBe(200);
  // assert expected shape
});
```

## Shared Proof Fixture (for browser tests)

For tests that need to capture API calls made by the browser, use the `proofTest`
fixture from `e2e/fixtures/proof.ts`:

```typescript
import { proofTest, expect } from './fixtures/proof.js';

proofTest('my feature records API calls', async ({ page, apiLog }) => {
  await page.goto('/my-feature');
  // ... test assertions
  // apiLog is automatically saved to e2e-proof/{test-slug}/api-log.json
});
```

The fixture automatically:
- Intercepts all HTTP requests made by the browser
- Records URL, method, request body, response status, response body, and duration
- Saves `api-log.json` to `e2e-proof/{test-slug}/`
- Saves `proof-summary.md` linking all artifacts

## Viewing Reports
```bash
npm run test:e2e:report   # opens Playwright HTML report from e2e-proof/
```
