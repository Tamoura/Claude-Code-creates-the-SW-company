# Mu'aththir E2E Tests

End-to-end tests for Mu'aththir holistic child development platform using Playwright.

## Setup

Install dependencies:

```bash
cd products/muaththir/e2e
npm install
npx playwright install chromium
```

## Running Tests

### Auto-start web server (recommended)

The Playwright config automatically starts the web dev server on port 3108:

```bash
npm test
```

### Manual server start

If you prefer to start servers manually:

1. Start the API server:
```bash
cd products/muaththir/apps/api
npm run dev
```

2. Start the web server:
```bash
cd products/muaththir/apps/web
npm run dev
```

3. Run tests (with existing server):
```bash
cd products/muaththir/e2e
npm test
```

## Available Commands

- `npm test` - Run all tests (auto-starts web server)
- `npm run test:headed` - Run tests with browser visible
- `npm run test:debug` - Run tests in debug mode with Playwright Inspector
- `npm run test:ui` - Run tests with Playwright UI mode
- `npm report` - Show HTML test report

## Test Coverage

### Public Pages (`tests/public-pages.spec.ts`)
- Landing page loads and displays key content
- Navigation works across public pages
- Pricing page displays information
- About page displays company information
- Privacy policy page loads
- Terms of service page loads

### Authentication Flow (`tests/auth-flow.spec.ts`)
- Login page renders with email and password fields
- Login form validates required fields
- Login page has link to signup
- Login page has forgot password link
- Signup page renders with required fields
- Signup form validates required fields
- Signup page has link to login
- Forgot password page renders
- Forgot password form validates email field

### Dashboard Access (`tests/dashboard.spec.ts`)
- Unauthenticated users are redirected to login when accessing:
  - /dashboard
  - /dashboard/observe
  - /dashboard/timeline
  - /dashboard/dimensions
  - /dashboard/milestones
  - /dashboard/settings
  - /onboarding
  - /onboarding/child

## Architecture Notes

- **Single worker**: Tests run sequentially to avoid rate-limit issues
- **Auto-start**: Playwright automatically starts the web dev server
- **Chromium only**: Faster test runs, sufficient for initial coverage
- **No auth fixture yet**: Current tests only verify unauthenticated flows
- **Future enhancements**: Add auth fixture pattern when auth is fully implemented

## Adding New Tests

1. Create test file in `tests/` directory
2. Follow naming convention: `feature-name.spec.ts`
3. Use descriptive test names
4. Add to this README under Test Coverage

## Troubleshooting

### Port already in use
If port 3108 is already in use, Playwright will reuse the existing server (local dev mode).

### Tests timing out
Increase timeout in `playwright.config.ts` `webServer.timeout` if needed.

### Browser not found
Run `npx playwright install chromium` to install the browser.
