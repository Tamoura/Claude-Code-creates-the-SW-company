# Motqen - Product Requirements Document

> **Motqen** (متقن) - Arabic for "The one who perfects", from إتقان (itqan), the concept of excellence and mastery in work.

**Version**: 1.0
**Status**: Draft
**Last Updated**: 2026-02-02
**Product Manager**: Claude Product Manager
**Target Launch**: 8 weeks from development start

---

## 1. Executive Summary

### 1.1 Vision

Motqen is a CLI-first, Git-native AI testing tool that lets developers write their first Playwright test in 30 seconds and keep it passing forever. Developers describe what they want to test in natural language, and Motqen generates standard Playwright `.spec.ts` files -- no proprietary formats, no lock-in, no runtime magic. When tests break due to UI changes, Motqen detects the failure and opens a PR with the fix, keeping test suites green without manual intervention.

### 1.2 Problem Statement

End-to-end testing is universally acknowledged as valuable but consistently under-adopted. Teams know they should write E2E tests, but the friction is too high: learning Playwright's API, figuring out selectors, handling async waits, maintaining tests as the UI evolves, and debugging flaky failures in CI.

**Core Problems We Solve**:
- **Test authoring friction**: Writing a single Playwright test takes 15-60 minutes for a developer unfamiliar with the API. Motqen reduces this to 30 seconds.
- **Selector brittleness**: Tests break when CSS classes or DOM structure changes. Motqen uses intelligent selector strategies and self-healing PRs to fix these automatically.
- **CI blind spots**: Teams run tests locally but lack visibility into cross-browser failures, flakiness trends, and test duration regressions. Motqen's cloud runner and dashboard surface these.
- **Maintenance burden**: The ongoing cost of maintaining E2E tests often exceeds the cost of writing them. Self-healing eliminates the single largest maintenance category (broken selectors).
- **Skill barrier**: Not every developer knows Playwright. Natural language generation democratizes test authoring across the entire team.

**The Opportunity**: The testing tools market is projected at $50B+ by 2027. Playwright has emerged as the dominant E2E framework (70%+ growth YoY), but no tool has combined AI generation with standard Playwright output. Competitors like Testim and Mabl use proprietary formats. Cypress Cloud charges for parallelization. Motqen occupies a unique position: open-source CLI that generates standard Playwright, with a SaaS platform for cloud execution and analytics.

### 1.3 Target Market

**Primary**: Engineering teams at startups and SMBs (10-200 engineers)
- JavaScript/TypeScript shops using React, Next.js, Vue, Angular
- Teams with existing Playwright adoption or evaluating E2E frameworks
- DevOps-mature teams with CI/CD pipelines already in place

**Secondary**: Enterprise teams piloting AI-assisted testing in specific projects

**Initial Launch Market**: English-speaking, GitHub-using teams

### 1.4 Business Model

| Tier | Price | Includes |
|------|-------|----------|
| **Free (OSS)** | $0 | CLI: generate, record, run locally. 50 cloud runs/month. |
| **Team** | $49/month | 500 cloud runs/month, 3 users, dashboard, GitHub Action, PR comments |
| **Scale** | $199/month | 5,000 cloud runs/month, unlimited users, self-healing PRs, priority support |
| **Enterprise** | Custom | Unlimited runs, SSO, dedicated runners, SLA, on-prem option |

### 1.5 Success Metrics

See Section 8 for detailed KPIs.

### 1.6 Technology Stack

| Component | Technology | Notes |
|-----------|------------|-------|
| CLI | TypeScript, MIT license | Open-source, npm package |
| Backend API | Fastify + Prisma + PostgreSQL | Port 5005 |
| Frontend Dashboard | Next.js 14 + React 18 + Tailwind | Port 3110 |
| LLM | Claude API (Anthropic) | Test generation engine |
| Cloud Runners | Containerized Playwright (Docker) | Parallel cross-browser |
| CI Integration | GitHub Actions | Official action in marketplace |
| Auth | GitHub OAuth + API keys | CLI uses API keys, web uses OAuth |

---

## 2. User Personas

### Persona 1: Sarah Chen - Frontend Tech Lead

**Demographics**:
- Age: 32
- Role: Frontend tech lead at a 40-person SaaS startup
- Team size: 6 frontend engineers
- Stack: Next.js, TypeScript, Tailwind
- Testing today: 200+ unit tests (Jest), 12 Playwright tests she wrote herself, no one else on the team writes E2E tests
- Technical skill: Expert

**Goals**:
- Get her entire team writing E2E tests, not just herself
- Catch regressions in CI before they reach staging
- Stop spending Friday afternoons fixing broken selectors after design sprints
- Have a dashboard showing test health trends to share in sprint retros

**Pain Points**:
- She's the only one who understands Playwright on the team; other devs skip E2E tests because the learning curve is too steep
- Every time the design team updates the component library, 4-5 E2E tests break due to changed class names or restructured DOM
- The team's 12 Playwright tests take 8 minutes in CI because they run sequentially in a single browser
- There is no visibility into which tests are flaky vs. genuinely broken -- she triages manually

**Usage Context**:
- Uses Motqen CLI daily to generate tests for new features before PR review
- Requires her team to include a `motqen generate` step in their PR checklist
- Reviews the Motqen dashboard weekly for flakiness trends
- Relies on GitHub Action for CI gating

**What Sarah Says**:
_"I don't need another testing framework. I need my team to actually write Playwright tests, and I need those tests to stop breaking every sprint."_

---

### Persona 2: Marcus Rivera - Full-Stack Developer

**Demographics**:
- Age: 27
- Role: Full-stack developer at a 15-person startup
- Stack: React + Node.js + PostgreSQL
- Testing today: Some unit tests, zero E2E tests
- Technical skill: Intermediate (strong in React, weak in testing)

**Goals**:
- Add E2E test coverage to the product without spending a week learning Playwright
- Impress his tech lead by shipping features with tests included
- Have tests that actually catch bugs instead of just checking boxes

**Pain Points**:
- Tried Playwright once, spent 2 hours on a login test, got frustrated by `waitForSelector` and timing issues, gave up
- His PRs get flagged in review for lacking tests, but nobody shows him how to write E2E tests
- When he does write tests, they pass locally but fail in CI due to environment differences
- Does not know which selectors to use -- IDs, data-testid, CSS classes -- and picks the wrong ones

**Usage Context**:
- Uses `motqen generate` multiple times per week when building new features
- Uses `motqen record` occasionally for complex flows he cannot describe in words
- Runs tests locally with `motqen run` before pushing
- Relies on the GitHub Action to validate cross-browser

**What Marcus Says**:
_"I know tests are important. I just don't know how to write good ones. If I could describe what I want to test and get real Playwright code, I'd test everything."_

---

### Persona 3: Priya Sharma - Engineering Manager

**Demographics**:
- Age: 38
- Role: VP of Engineering at a 120-person B2B SaaS company
- Teams: 4 squads, ~8 engineers each
- Testing today: Extensive unit tests, patchy E2E coverage (~15% of user flows), one dedicated QA engineer
- Technical skill: Strategic (codes occasionally, manages primarily)

**Goals**:
- Increase E2E coverage from 15% to 60% of critical user flows within two quarters
- Reduce production incidents caused by UI regressions (currently 3-4/month)
- Consolidate testing infrastructure spend (currently paying for Cypress Cloud + BrowserStack + custom CI scripts)
- Give her QA engineer leverage by automating routine regression tests

**Pain Points**:
- Each squad has different testing practices; no consistency in test quality or coverage
- Production incidents from UI regressions cost the company roughly $15K/month in engineering time and customer trust
- The QA engineer is a bottleneck -- every feature waits for manual regression testing
- She cannot get budget approved for more QA hires, but can justify tooling spend if ROI is clear

**Usage Context**:
- Does not use the CLI herself; evaluates Motqen based on dashboard metrics and team adoption
- Reviews the team usage dashboard monthly to track adoption across squads
- Uses test failure categorization to prioritize engineering investment
- Compares Motqen cost against current Cypress Cloud + BrowserStack spend

**What Priya Says**:
_"I need a tool that makes my existing engineers 3x more productive at testing, not a tool that requires hiring testing specialists."_

---

## 3. User Stories by Epic

### Epic 1: CLI Core (P0 - MVP)

#### TP-001: Install and Setup Motqen CLI

**As** Marcus (full-stack developer), **I want to** install Motqen with a single command and initialize it in my project, **so that** I can start generating tests within a minute.

**Priority**: P0

**Acceptance Criteria**:

```gherkin
Scenario: Install Motqen globally via npm
  Given I have Node.js 18+ and npm installed
  When I run "npm install -g @motqen/cli"
  Then the "motqen" command is available in my terminal
  And running "motqen --version" prints the current version

Scenario: Initialize Motqen in a project
  Given I am in a project directory with a package.json
  And Motqen CLI is installed
  When I run "motqen init"
  Then a "motqen.config.ts" file is created in the project root
  And a "tests/" directory is created if it does not exist
  And the config includes default baseUrl, testDir, and browser settings
  And the config includes a placeholder for the API key

Scenario: Initialize Motqen when Playwright is not installed
  Given I am in a project without @playwright/test as a dependency
  When I run "motqen init"
  Then Motqen prompts me to install Playwright
  And if I confirm, it runs "npm install -D @playwright/test"
  And then proceeds with initialization

Scenario: Initialize Motqen when Playwright already exists
  Given I am in a project with an existing playwright.config.ts
  When I run "motqen init"
  Then Motqen detects the existing Playwright config
  And offers to use the existing config's baseUrl and testDir
  And does not overwrite the existing playwright.config.ts
```

**Technical Notes**:
- CLI packaged as `@motqen/cli` on npm
- `motqen.config.ts` extends Playwright config with Motqen-specific fields (apiKey, cloudEnabled, etc.)
- Auto-detect package manager (npm, yarn, pnpm) for install prompts

---

#### TP-002: Generate Test from Natural Language Prompt

**As** Marcus (full-stack developer), **I want to** describe a test scenario in plain English and get a working Playwright spec file, **so that** I can add E2E coverage without learning the Playwright API.

**Priority**: P0

**Acceptance Criteria**:

```gherkin
Scenario: Generate a test from a text prompt
  Given I have Motqen initialized in my project
  And I have a valid API key configured
  When I run 'motqen generate "user can log in with email and password"'
  Then a file "tests/user-can-log-in.spec.ts" is created
  And the file contains valid Playwright test code
  And the file imports from "@playwright/test"
  And the test uses the baseUrl from motqen.config.ts
  And the file includes a descriptive test.describe block
  And the file includes at least one test() with assertions

Scenario: Generate a test with output path specified
  Given Motqen is initialized
  When I run 'motqen generate "checkout flow" --output tests/e2e/checkout.spec.ts'
  Then the file is created at "tests/e2e/checkout.spec.ts"
  And parent directories are created if they do not exist

Scenario: Generate a test with context from existing page
  Given Motqen is initialized
  And my project has a running dev server at the configured baseUrl
  When I run 'motqen generate "user can log in" --url http://localhost:3000/login'
  Then Motqen crawls the page at the given URL
  And uses the page's DOM structure to inform selector choices
  And the generated test uses selectors that match the actual page

Scenario: Handle missing API key
  Given Motqen is initialized
  And no API key is configured
  When I run 'motqen generate "any test"'
  Then Motqen prints an error explaining how to set the API key
  And provides the URL to obtain an API key from the dashboard
  And exits with code 1

Scenario: Handle generation failure gracefully
  Given Motqen is initialized with a valid API key
  And the API is unreachable
  When I run 'motqen generate "any test"'
  Then Motqen prints a clear error message
  And suggests checking network connectivity
  And exits with code 1
```

**Technical Notes**:
- The CLI sends the prompt + optional page context to the Motqen API (`POST /api/v1/generate`)
- The API calls Claude with a system prompt optimized for Playwright code generation
- Generated code is formatted with Prettier using the project's config if available
- Filename is auto-derived from the prompt (slugified) unless `--output` is specified
- The `--url` flag triggers a headless browser crawl to extract DOM structure, accessible elements, and form fields

---

#### TP-003: Record Browser Session to Generate Test

**As** Marcus (full-stack developer), **I want to** record my interactions with a web app and have Motqen generate a Playwright spec from the recording, **so that** I can create tests for complex flows I cannot easily describe in words.

**Priority**: P0

**Acceptance Criteria**:

```gherkin
Scenario: Record a browser session
  Given Motqen is initialized
  When I run "motqen record --url http://localhost:3000"
  Then a Chromium browser window opens at the specified URL
  And Motqen displays a floating toolbar with "Stop Recording" button
  And all my clicks, form inputs, and navigations are tracked

Scenario: Stop recording and generate spec
  Given I am in an active recording session
  When I click the "Stop Recording" button in the toolbar
  Then the browser window closes
  And Motqen generates a .spec.ts file from the recorded actions
  And the file uses intelligent selectors (data-testid > role > text > CSS)
  And the file includes appropriate assertions for navigation and visibility
  And the file path is printed to the terminal

Scenario: Record with assertions
  Given I am in an active recording session
  When I right-click on an element and select "Assert visible"
  Then an expect(locator).toBeVisible() assertion is added to the recording
  And the assertion uses the best available selector for that element

Scenario: Cancel a recording
  Given I am in an active recording session
  When I press Ctrl+C in the terminal
  Then the browser closes without generating a file
  And a message confirms the recording was cancelled
```

**Technical Notes**:
- Built on top of Playwright's codegen, but post-processes with Claude to improve selectors, add assertions, and structure the output
- The recorded actions are sent to the Motqen API for AI-enhanced cleanup before writing the file
- Selector priority: `data-testid` > ARIA role/label > visible text > CSS class (configurable in motqen.config.ts)
- Recording uses Playwright's browser context with a custom page script for the toolbar overlay

---

#### TP-004: Run Tests Locally with Enhanced Output

**As** Sarah (tech lead), **I want to** run my Playwright tests through Motqen with better output formatting and automatic reporting, **so that** I get clearer feedback locally and results are synced to the dashboard.

**Priority**: P0

**Acceptance Criteria**:

```gherkin
Scenario: Run all tests locally
  Given Motqen is initialized with tests in the configured testDir
  When I run "motqen run"
  Then all Playwright spec files in the testDir are executed
  And results are displayed with color-coded pass/fail indicators
  And failed tests show a clear diff of expected vs. actual
  And a summary line shows total/passed/failed/skipped counts
  And total execution time is displayed

Scenario: Run a specific test file
  Given Motqen is initialized
  When I run "motqen run tests/login.spec.ts"
  Then only the specified file is executed
  And results are displayed for that file only

Scenario: Run tests and report to cloud
  Given Motqen is initialized with a valid API key
  And cloudReporting is enabled in motqen.config.ts
  When I run "motqen run"
  Then test results are uploaded to the Motqen cloud after execution
  And a URL to the test run in the dashboard is printed
  And the upload does not block the terminal output

Scenario: Run tests without cloud reporting
  Given Motqen is initialized
  And cloudReporting is disabled or no API key is configured
  When I run "motqen run"
  Then tests execute normally with enhanced output
  And no attempt is made to upload results
  And no error is shown about missing cloud config

Scenario: Run tests in headed mode for debugging
  Given Motqen is initialized
  When I run "motqen run --headed"
  Then tests execute with a visible browser window
  And the browser stays open on failure for inspection
```

**Technical Notes**:
- `motqen run` wraps `npx playwright test` with enhanced reporters
- Cloud reporting is a POST to `POST /api/v1/runs` with results payload
- The enhanced output includes: step-by-step action logging, screenshot on failure, trace file link
- Supports all Playwright CLI flags as pass-through (e.g., `--workers`, `--project`, `--grep`)

---

#### TP-005: Configure Project Settings

**As** Sarah (tech lead), **I want to** configure Motqen settings for my project in a typed config file, **so that** my team has consistent test generation and execution settings.

**Priority**: P0

**Acceptance Criteria**:

```gherkin
Scenario: Create default config on init
  Given I run "motqen init"
  Then a motqen.config.ts file is created with these fields:
    | Field          | Default Value           |
    | baseUrl        | http://localhost:3000    |
    | testDir        | tests/                  |
    | apiKey         | (empty, from env var)   |
    | browsers       | ["chromium"]            |
    | cloudReporting | false                   |
    | selectorStrategy | ["data-testid", "role", "text", "css"] |
    | outputFormat   | typescript              |

Scenario: Validate config on any command
  Given motqen.config.ts has an invalid baseUrl (not a URL)
  When I run any motqen command
  Then a clear validation error is shown
  And the specific invalid field and expected format are named

Scenario: Config supports environment variable substitution
  Given motqen.config.ts has apiKey set to "process.env.MOTQEN_API_KEY"
  And the environment variable MOTQEN_API_KEY is set
  When I run any motqen command requiring authentication
  Then the API key is read from the environment variable

Scenario: Extend existing Playwright config
  Given a project has an existing playwright.config.ts
  And motqen.config.ts references it via playwrightConfig field
  When tests are run
  Then Motqen merges its config with the Playwright config
  And Playwright-native fields (projects, webServer, etc.) are preserved
```

**Technical Notes**:
- Config file uses TypeScript for type safety and autocompletion
- Exports a `defineConfig()` function for IDE support
- Reads `MOTQEN_API_KEY` from environment by default (overridable in config)
- Config schema is validated with Zod at CLI startup

---

### Epic 2: Test Generation AI (P0 - MVP)

#### TP-010: Generate Login/Auth Flow Tests

**As** Marcus (full-stack developer), **I want to** generate tests for authentication flows by describing them in natural language, **so that** I can cover the most critical user journey without manually writing complex test code.

**Priority**: P0

**Acceptance Criteria**:

```gherkin
Scenario: Generate a basic email/password login test
  Given Motqen is initialized with a baseUrl pointing to my app
  When I run 'motqen generate "user logs in with email and password"'
  Then the generated test navigates to the login page
  And fills in email and password fields using appropriate selectors
  And submits the form
  And asserts successful navigation to the dashboard or home page
  And includes a test.describe block named "Authentication"

Scenario: Generate a login test with page context
  Given my app's login page is running at http://localhost:3000/login
  When I run 'motqen generate "user logs in" --url http://localhost:3000/login'
  Then Motqen inspects the login page DOM
  And uses actual form field names/IDs from the page
  And generates selectors that match the real page structure
  And includes realistic test data (e.g., test@example.com)

Scenario: Generate OAuth login test
  Given Motqen is initialized
  When I run 'motqen generate "user logs in with GitHub OAuth"'
  Then the generated test includes a note about OAuth testing limitations
  And suggests mocking the OAuth provider or using a test account
  And generates the pre-OAuth and post-OAuth redirect assertion code

Scenario: Generate signup + email verification test
  Given Motqen is initialized
  When I run 'motqen generate "new user signs up and verifies email"'
  Then the generated test includes signup form filling
  And includes a comment placeholder for email verification handling
  And suggests using Playwright's route interception for email verification
```

**Technical Notes**:
- Auth flows are the #1 requested test type; generation quality here is critical for adoption
- The AI prompt includes common auth patterns (form-based, OAuth, magic link, MFA)
- Generated tests use `page.getByRole()` and `page.getByLabel()` as primary selectors for auth forms
- Test data uses clearly fake values (test@example.com, Password123!) with a comment to customize

---

#### TP-011: Generate CRUD Operation Tests

**As** Sarah (tech lead), **I want to** generate tests for create/read/update/delete flows, **so that** I can cover data management features that make up the bulk of our application.

**Priority**: P0

**Acceptance Criteria**:

```gherkin
Scenario: Generate a "create item" test
  Given Motqen is initialized
  When I run 'motqen generate "admin creates a new product with name, price, and description"'
  Then the generated test navigates to a creation form
  And fills in name, price, and description fields
  And submits the form
  And asserts the new item appears in a list or detail view
  And includes cleanup logic or a note about test data isolation

Scenario: Generate a "read/list" test
  Given Motqen is initialized
  When I run 'motqen generate "user views list of orders and filters by status"'
  Then the generated test navigates to the list view
  And asserts that items are displayed
  And interacts with filter controls
  And asserts the filtered results change appropriately

Scenario: Generate an "update item" test
  Given Motqen is initialized
  When I run 'motqen generate "user edits their profile name and saves"'
  Then the generated test navigates to the edit form
  And modifies a field value
  And submits the form
  And asserts the updated value is displayed

Scenario: Generate a "delete item" test
  Given Motqen is initialized
  When I run 'motqen generate "admin deletes a user and confirms the dialog"'
  Then the generated test triggers the delete action
  And handles a confirmation dialog
  And asserts the item is removed from the list
```

**Technical Notes**:
- CRUD tests require understanding of data dependencies (e.g., create before update/delete)
- The AI generates `test.beforeEach` and `test.afterEach` hooks for setup/teardown where appropriate
- Generated tests use `test.describe.serial()` when operations must run in order

---

#### TP-012: Generate Form Validation Tests

**As** Marcus (full-stack developer), **I want to** generate tests that verify form validation rules, **so that** I can ensure error messages appear correctly for invalid inputs.

**Priority**: P0

**Acceptance Criteria**:

```gherkin
Scenario: Generate validation tests from prompt
  Given Motqen is initialized
  When I run 'motqen generate "signup form shows errors for empty email, short password, and mismatched password confirmation"'
  Then the generated test includes multiple test cases:
    | Case                    | Action                          | Assertion                        |
    | Empty email             | Submit with empty email field   | Error message for email shown    |
    | Short password          | Enter password < 8 chars        | Error message for password shown |
    | Mismatched confirmation | Enter different confirm password | Mismatch error shown             |
  And each case is a separate test() within a test.describe block
  And assertions check for visible error messages using text content

Scenario: Generate validation tests with page context
  Given the signup page is running and has HTML5 validation attributes
  When I run 'motqen generate "form validation" --url http://localhost:3000/signup'
  Then Motqen reads the actual validation rules from the DOM (required, minlength, pattern, etc.)
  And generates tests that match the real validation behavior
```

**Technical Notes**:
- The AI inspects `required`, `minlength`, `maxlength`, `pattern`, and `type` attributes when `--url` is used
- Generates both HTML5 native validation tests and custom JS validation tests
- Each validation rule gets its own test case for clear failure reporting

---

#### TP-013: Generate Navigation/Routing Tests

**As** Sarah (tech lead), **I want to** generate tests for navigation flows and route protection, **so that** I can verify that all pages are reachable and auth guards work correctly.

**Priority**: P0

**Acceptance Criteria**:

```gherkin
Scenario: Generate navigation test
  Given Motqen is initialized
  When I run 'motqen generate "user navigates from home to pricing to signup"'
  Then the generated test visits the home page
  And clicks navigation links to reach pricing
  And clicks a CTA to reach signup
  And asserts the correct URL at each step
  And asserts key content is visible on each page

Scenario: Generate auth guard test
  Given Motqen is initialized
  When I run 'motqen generate "unauthenticated user is redirected from dashboard to login"'
  Then the generated test attempts to visit a protected route
  And asserts a redirect to the login page occurs
  And verifies the redirect URL includes the original destination for return
```

**Technical Notes**:
- Navigation tests use `page.goto()` and `page.click()` with `page.waitForURL()` assertions
- The AI understands common routing patterns (Next.js App Router, React Router, Vue Router)
- Auth guard tests check both the redirect and the return-to-original-page flow

---

#### TP-014: Handle Dynamic Selectors Intelligently

**As** Sarah (tech lead), **I want** Motqen to generate tests with resilient selectors that do not break when CSS classes change, **so that** our tests require less maintenance.

**Priority**: P0

**Acceptance Criteria**:

```gherkin
Scenario: Prefer stable selectors over CSS classes
  Given Motqen is generating a test with --url context
  And the target page has elements with data-testid, roles, and CSS classes
  Then the generated test uses selectors in this priority order:
    1. data-testid attributes (page.getByTestId())
    2. ARIA roles and labels (page.getByRole(), page.getByLabel())
    3. Visible text content (page.getByText())
    4. CSS selectors (page.locator()) only as last resort
  And a comment explains the selector choice if CSS is used

Scenario: Suggest adding data-testid when none exist
  Given the target page has no data-testid attributes
  When Motqen generates a test
  Then the generated file includes a comment block suggesting data-testid additions
  And the suggestions include the element, the recommended testid value, and the JSX/HTML to add

Scenario: Handle dynamically generated selectors
  Given the target page has elements with auto-generated class names (e.g., CSS modules, Tailwind JIT)
  When Motqen generates a test
  Then it avoids using those auto-generated class names as selectors
  And falls back to text content, role, or structural selectors
```

**Technical Notes**:
- Selector strategy is configurable in `motqen.config.ts` via the `selectorStrategy` array
- The AI analyzes the DOM tree to determine selector stability scores
- CSS module hashes (e.g., `_container_1a2b3`) and Tailwind utility classes are detected and avoided

---

#### TP-015: Confidence Scoring for Generated Tests

**As** Sarah (tech lead), **I want** each generated test to include a confidence score and warnings, **so that** I know which parts need manual review before trusting the test.

**Priority**: P0

**Acceptance Criteria**:

```gherkin
Scenario: Display confidence score after generation
  Given Motqen generates a test
  Then the terminal output includes a confidence score (0-100%)
  And the score considers:
    | Factor                  | Weight |
    | URL context provided    | +20%   |
    | Stable selectors found  | +25%   |
    | Clear assertion targets | +20%   |
    | Prompt specificity      | +15%   |
    | Common pattern match    | +20%   |

Scenario: Include warnings in generated file
  Given Motqen generates a test with low confidence (<60%)
  Then the generated file includes a comment block at the top listing warnings
  And warnings include:
    - "Selectors may be fragile -- consider adding data-testid attributes"
    - "No URL context provided -- selectors are best-guess"
    - "Complex flow detected -- manual review recommended"

Scenario: High-confidence generation
  Given a prompt with --url context and a page with data-testid attributes
  When Motqen generates a test
  Then the confidence score is >80%
  And no warnings are included in the generated file
```

**Technical Notes**:
- Confidence score is computed server-side and returned in the API response
- Score factors are logged for internal analytics (not shown to user beyond the total)
- Low-confidence tests (<40%) include a `test.fixme()` annotation suggesting review

---

### Epic 3: Cloud Platform (P0 - MVP)

#### TP-020: User Signup/Login to Motqen Dashboard

**As** Priya (engineering manager), **I want to** create an account on Motqen and log in to the dashboard, **so that** I can manage my team's testing infrastructure.

**Priority**: P0

**Acceptance Criteria**:

```gherkin
Scenario: Sign up with GitHub OAuth
  Given I navigate to https://app.motqen.dev/signup
  When I click "Sign up with GitHub"
  Then I am redirected to GitHub's OAuth flow
  And after authorizing, I am redirected back to Motqen
  And my account is created with my GitHub profile information
  And I am placed on the Free tier
  And I land on the onboarding wizard

Scenario: Sign up with email and password
  Given I navigate to https://app.motqen.dev/signup
  When I fill in email, name, and password
  And click "Create Account"
  Then a verification email is sent
  And I am shown a "Check your email" screen
  And after clicking the verification link, my account is activated

Scenario: Log in to existing account
  Given I have an existing Motqen account
  When I navigate to https://app.motqen.dev/login
  And enter my credentials (email or GitHub OAuth)
  Then I am authenticated and redirected to the dashboard

Scenario: Create an organization during onboarding
  Given I just signed up and am on the onboarding wizard
  When I enter an organization name (e.g., "Acme Corp")
  Then an organization is created
  And I am set as the owner
  And the organization is on the Free tier
```

**Technical Notes**:
- GitHub OAuth is the primary auth method (aligns with target market)
- Email/password is secondary, uses bcrypt hashing
- JWT tokens for session management, refresh tokens in httpOnly cookies
- Organization is the billing entity; users belong to organizations

---

#### TP-021: Connect Repository (GitHub Integration)

**As** Sarah (tech lead), **I want to** connect my GitHub repository to Motqen, **so that** test results are linked to my codebase and PRs.

**Priority**: P0

**Acceptance Criteria**:

```gherkin
Scenario: Connect a GitHub repository
  Given I am logged in and have a GitHub-connected account
  When I navigate to Settings > Repositories
  And click "Connect Repository"
  Then I see a list of my GitHub repositories (personal and org)
  And I select a repository
  And Motqen installs its GitHub App on that repository
  And the repository appears as "Connected" in settings

Scenario: View connected repository details
  Given I have a connected repository
  When I navigate to the repository's page in the dashboard
  Then I see: repository name, last test run, branch info, and configuration status

Scenario: Disconnect a repository
  Given I have a connected repository
  When I click "Disconnect" on the repository settings
  Then the GitHub App is uninstalled from that repository
  And historical test data is retained but no new runs are processed
```

**Technical Notes**:
- Uses GitHub App (not OAuth app) for repository-level permissions
- Required GitHub App permissions: `checks:write`, `pull_requests:write`, `contents:read`
- Repository connection creates a `Project` entity linked to the `Organization`

---

#### TP-022: Cloud Test Execution

**As** Sarah (tech lead), **I want to** run my Playwright tests in the cloud across multiple browsers in parallel, **so that** CI runs are fast and cross-browser coverage is automatic.

**Priority**: P0

**Acceptance Criteria**:

```gherkin
Scenario: Trigger cloud test run from CLI
  Given Motqen is initialized with a valid API key
  When I run "motqen run --cloud"
  Then my test files are packaged and uploaded to the Motqen cloud
  And the cloud spins up containerized Playwright runners
  And tests execute in parallel across configured browsers
  And real-time progress is streamed to the terminal
  And final results are displayed when all tests complete

Scenario: Trigger cloud test run from dashboard
  Given I am on the project page in the dashboard
  When I click "Run Tests" and select branch and browsers
  Then a cloud test run is triggered for the selected configuration
  And I can watch real-time progress on the run detail page

Scenario: Parallel execution across browsers
  Given I have 20 test files and configured browsers: chromium, firefox, webkit
  When a cloud run is triggered
  Then tests are distributed across multiple containers
  And all three browsers run in parallel
  And results are aggregated into a single test run report

Scenario: Cloud run with environment variables
  Given I have secrets configured in the Motqen dashboard
  When a cloud run executes
  Then the configured environment variables are injected into the runner containers
  And secrets are never logged or exposed in test output

Scenario: Free tier usage limits
  Given I am on the Free tier (50 cloud runs/month)
  And I have used 50 runs this month
  When I attempt to trigger another cloud run
  Then I receive a message explaining the limit
  And I am prompted to upgrade to the Team plan
```

**Technical Notes**:
- Runners are Docker containers with Playwright browsers pre-installed
- Test files are uploaded as a tarball (excluding node_modules, using .motqenignore)
- Each container runs a subset of tests; results are collected via a message queue
- Streaming uses Server-Sent Events (SSE) from the API to CLI/dashboard
- Containers are ephemeral -- spun up per run, destroyed after

---

#### TP-023: View Test Results and History

**As** Priya (engineering manager), **I want to** view test results in the dashboard with pass/fail status, failure details, and screenshots, **so that** I can understand the state of our test suite at a glance.

**Priority**: P0

**Acceptance Criteria**:

```gherkin
Scenario: View latest test run results
  Given I have at least one completed test run
  When I navigate to the project dashboard
  Then I see the latest test run with:
    | Field              | Example                     |
    | Status             | Passed / Failed / Running   |
    | Pass/Fail count    | 18/20 passed                |
    | Duration           | 2m 34s                      |
    | Branch             | feature/checkout             |
    | Commit             | abc1234                      |
    | Triggered by       | GitHub Action / Manual / CLI |

Scenario: View individual test result details
  Given I click on a failed test in the run results
  Then I see:
    - The test name and file path
    - The error message and stack trace
    - A screenshot taken at the point of failure
    - A link to download the Playwright trace file
    - The browser and viewport where it failed

Scenario: View test run history
  Given I navigate to the project's "Runs" page
  Then I see a paginated list of all test runs
  And each row shows: status, pass/fail count, duration, branch, timestamp
  And I can filter by branch, status, and date range
```

**Technical Notes**:
- Screenshots and traces are stored in cloud object storage (S3-compatible)
- Test results are stored in PostgreSQL with indexed queries for filtering
- Dashboard uses real-time WebSocket updates for in-progress runs

---

#### TP-024: API Key Management for CLI Authentication

**As** Marcus (full-stack developer), **I want to** generate and manage API keys for CLI authentication, **so that** I can securely connect my local CLI to the Motqen cloud.

**Priority**: P0

**Acceptance Criteria**:

```gherkin
Scenario: Generate an API key
  Given I am logged into the Motqen dashboard
  When I navigate to Settings > API Keys
  And click "Generate New Key"
  And enter a description (e.g., "Marcus laptop")
  Then a new API key is generated and displayed once
  And a warning explains the key will not be shown again
  And the key is added to the list with its description and creation date

Scenario: Use API key in CLI
  Given I have a Motqen API key
  When I set MOTQEN_API_KEY in my environment or motqen.config.ts
  And run any CLI command that requires authentication
  Then the command authenticates successfully against the cloud

Scenario: Revoke an API key
  Given I have an active API key
  When I click "Revoke" on the key in the dashboard
  And confirm the revocation
  Then the key is immediately invalidated
  And any CLI using that key receives a 401 Unauthorized on next request

Scenario: API key scoping
  Given I generate an API key
  Then the key is scoped to my organization
  And can access all projects within the organization
  And cannot access projects in other organizations
```

**Technical Notes**:
- API keys are hashed (SHA-256) before storage; raw key shown only once
- Keys are prefixed with `tp_` for easy identification
- Rate limiting: 100 requests/minute per API key
- Keys are scoped to organization, not individual user

---

### Epic 4: CI/CD Integration (P0 - MVP)

#### TP-030: GitHub Action for Running Tests in CI

**As** Sarah (tech lead), **I want to** run Motqen tests in my GitHub Actions CI pipeline, **so that** every PR is automatically tested across browsers.

**Priority**: P0

**Acceptance Criteria**:

```gherkin
Scenario: Add Motqen GitHub Action to workflow
  Given I create a .github/workflows/motqen.yml file with:
    """yaml
    - uses: connectsw/motqen-action@v1
      with:
        api-key: ${{ secrets.MOTQEN_API_KEY }}
    """
  When a push or PR triggers the workflow
  Then the action installs the Motqen CLI
  And runs "motqen run --cloud" with the configured API key
  And uploads results to the Motqen dashboard
  And the action exits with code 0 on all-pass, code 1 on any failure

Scenario: Configure browsers in the action
  Given the workflow includes:
    """yaml
    - uses: connectsw/motqen-action@v1
      with:
        api-key: ${{ secrets.MOTQEN_API_KEY }}
        browsers: chromium,firefox,webkit
    """
  When the action runs
  Then tests execute in all three browsers in parallel

Scenario: Action with custom test directory
  Given the workflow includes a "test-dir" input
  When the action runs
  Then only tests in the specified directory are executed
```

**Technical Notes**:
- GitHub Action is published to GitHub Marketplace
- Action is a composite action wrapping CLI commands (not Docker-based, for faster startup)
- Supports inputs: `api-key`, `browsers`, `test-dir`, `config-path`, `cloud` (boolean)
- Action version follows semver; `@v1` is a major version tag

---

#### TP-031: PR Status Checks

**As** Sarah (tech lead), **I want** Motqen to report test results as GitHub PR status checks, **so that** I can require passing tests before merging.

**Priority**: P0

**Acceptance Criteria**:

```gherkin
Scenario: Pass status check on all tests passing
  Given a PR triggers the Motqen GitHub Action
  And all tests pass
  Then a GitHub check named "Motqen" is created with status "success"
  And the check summary shows: total tests, passed count, duration
  And the check includes a link to the full results in the Motqen dashboard

Scenario: Fail status check on test failure
  Given a PR triggers the Motqen GitHub Action
  And one or more tests fail
  Then the "Motqen" check is created with status "failure"
  And the check summary lists the failed tests with error messages
  And the check includes failure screenshots as annotations

Scenario: Pending status during execution
  Given a PR triggers the Motqen GitHub Action
  And tests are currently running
  Then the "Motqen" check shows status "in_progress"
  And updates to "success" or "failure" when execution completes
```

**Technical Notes**:
- Uses GitHub Checks API via the installed GitHub App
- Check run is created at the start of execution and updated upon completion
- Annotations are used to inline failure details in the PR diff view

---

#### TP-032: Test Result Comments on PRs

**As** Marcus (full-stack developer), **I want** Motqen to post a summary comment on my PR with test results, **so that** reviewers can see test status without leaving the PR page.

**Priority**: P0

**Acceptance Criteria**:

```gherkin
Scenario: Post results comment on PR
  Given a PR triggers Motqen and tests complete
  Then a comment is posted on the PR with:
    """
    ## Motqen Results

    | Browser   | Passed | Failed | Duration |
    |-----------|--------|--------|----------|
    | Chromium  | 18     | 0      | 1m 12s   |
    | Firefox   | 18     | 0      | 1m 34s   |
    | WebKit    | 17     | 1      | 1m 28s   |

    **1 failure in WebKit**: `checkout.spec.ts > completes purchase`

    [View full results](https://app.motqen.dev/runs/xyz)
    """

Scenario: Update comment on re-run
  Given a Motqen comment already exists on the PR
  When tests are re-run (e.g., after a push)
  Then the existing comment is updated (not a new comment)
  And the comment shows the latest results
  And a "Last updated" timestamp is included

Scenario: No comment on passing runs (configurable)
  Given the project setting "commentOnPass" is set to false
  When all tests pass on a PR
  Then no comment is posted (reduces noise)
  And the status check still reports success
```

**Technical Notes**:
- Comments use the GitHub App's bot account
- Comment body is Markdown with a collapsible details section for verbose output
- Comment ID is stored per PR to enable update-in-place behavior
- Configurable in `motqen.config.ts` under `ci.commentOnPass` (default: true)

---

### Epic 5: Dashboard & Analytics (P1)

#### TP-040: Test Run History with Trends

**As** Priya (engineering manager), **I want to** see trends in test pass rates and execution times over the past 30/60/90 days, **so that** I can track whether our test suite is improving or degrading.

**Priority**: P1

**Acceptance Criteria**:

```gherkin
Scenario: View pass rate trend
  Given I navigate to the Analytics page
  Then I see a line chart showing daily pass rate over the selected time range
  And the chart defaults to 30 days
  And I can switch between 7, 30, 60, and 90-day views
  And hovering over a data point shows the exact pass rate and run count

Scenario: View duration trend
  Given I am on the Analytics page
  Then I see a line chart showing average test run duration over time
  And I can identify if duration is increasing (indicating bloating test suites)

Scenario: Filter trends by project and branch
  Given I am on the Analytics page
  When I select a specific project and branch
  Then all charts filter to show data only for that combination
```

**Technical Notes**:
- Charts rendered with a lightweight charting library (Recharts or Chart.js)
- Data is aggregated server-side into daily rollups for performance
- Branch filter defaults to the repository's default branch

---

#### TP-041: Test Duration Tracking

**As** Sarah (tech lead), **I want to** see which tests are the slowest, **so that** I can optimize or parallelize them.

**Priority**: P1

**Acceptance Criteria**:

```gherkin
Scenario: View slowest tests
  Given I navigate to Analytics > Duration
  Then I see a ranked list of the 20 slowest tests (by average duration)
  And each entry shows: test name, file, average duration, P95 duration, run count
  And I can click a test to see its duration over time

Scenario: Duration regression alerts
  Given a test's average duration increases by >50% over the past 5 runs
  When I view the test's details
  Then a warning badge is displayed indicating a duration regression
```

**Technical Notes**:
- Durations are captured per test case within each run
- P95 is calculated from the last 100 runs of each test

---

#### TP-042: Failure Categorization

**As** Priya (engineering manager), **I want** test failures to be automatically categorized, **so that** I can distinguish between real bugs, flaky tests, and infrastructure issues.

**Priority**: P1

**Acceptance Criteria**:

```gherkin
Scenario: Automatic failure categorization
  Given a test fails
  Then Motqen categorizes the failure as one of:
    | Category        | Criteria                                           |
    | Selector broken | Element not found / selector timeout               |
    | Assertion failed| expect() mismatch with actual vs. expected values  |
    | Timeout         | Navigation or page load timeout                    |
    | Network error   | Request failed, DNS resolution, SSL error          |
    | Flaky           | Test passed in previous run and failed now (or vice versa) |
    | Infrastructure  | Browser crash, container error, OOM                |
  And the category is displayed on the test result detail page
  And the category is filterable in the run results list

Scenario: Flakiness scoring
  Given a test has run at least 10 times
  Then a flakiness score is calculated (0-100%, where 100% = always passes or always fails)
  And tests with flakiness score between 20-80% are flagged as "flaky"
  And a dedicated "Flaky Tests" view lists all flagged tests
```

**Technical Notes**:
- Categorization is rule-based initially (pattern matching on error messages)
- Flakiness score = (number of status changes / total runs) * 100
- Phase 2: Use Claude to analyze error patterns for smarter categorization

---

#### TP-043: Team Usage Dashboard

**As** Priya (engineering manager), **I want to** see how my team is using Motqen, **so that** I can track adoption and justify the tool's cost.

**Priority**: P1

**Acceptance Criteria**:

```gherkin
Scenario: View team usage metrics
  Given I navigate to Settings > Usage
  Then I see:
    | Metric                    | Description                        |
    | Cloud runs this month     | Total runs with bar chart by week  |
    | Tests generated           | Number of motqen generate calls |
    | Active users              | Users who ran tests in past 30 days|
    | Tests per project         | Breakdown by connected repository  |
    | Browser distribution      | Pie chart of runs by browser       |

Scenario: View usage against plan limits
  Given I am on the Team plan (500 runs/month)
  Then a progress bar shows current usage (e.g., "342 / 500 runs used")
  And a projected usage estimate is shown based on current pace
  And a warning appears at 80% usage
```

**Technical Notes**:
- Usage data is real-time for cloud runs (tracked in the run queue)
- Generation count is tracked per API key
- Active users are tracked via API key usage logs

---

### Epic 6: Self-Healing (P1 - Phase 2 Preview)

> **Note**: Self-healing is a Phase 2 feature. The stories below are included for planning purposes and to inform Phase 1 architecture decisions. Phase 1 will lay the groundwork (selector tracking, failure categorization) that Phase 2 builds upon.

#### TP-050: Detect Broken Selectors

**As** Sarah (tech lead), **I want** Motqen to detect when a test failure is caused by a changed selector rather than a real bug, **so that** selector maintenance can be automated.

**Priority**: P1 (Phase 2)

**Acceptance Criteria**:

```gherkin
Scenario: Identify selector-caused failure
  Given a test fails because an element selector no longer matches any DOM element
  When Motqen analyzes the failure
  Then it identifies the specific selector that broke
  And crawls the current page to find likely replacement elements
  And reports: "Selector 'data-testid=submit-btn' not found. Likely match: 'data-testid=submit-button'"
  And flags the failure category as "Selector broken" (not "Real bug")

Scenario: Distinguish selector break from real bug
  Given a test fails with an assertion error (element exists but value is wrong)
  When Motqen analyzes the failure
  Then it does NOT flag this as a selector break
  And categorizes it as "Assertion failed" (likely a real bug)
```

**Technical Notes**:
- Selector analysis uses a headless crawl of the URL at the test's point of failure
- Fuzzy matching compares old selector attributes against current DOM
- Requires storing selector metadata from each test run for comparison

---

#### TP-051: Auto-Generate Fix PR

**As** Sarah (tech lead), **I want** Motqen to automatically open a PR that fixes broken selectors, **so that** I can review and merge the fix without manually editing test files.

**Priority**: P1 (Phase 2)

**Acceptance Criteria**:

```gherkin
Scenario: Generate fix PR for broken selector
  Given a test failure is categorized as "Selector broken"
  And a replacement selector has been identified with >80% confidence
  When auto-fix is enabled for the project
  Then Motqen creates a branch: "motqen/fix-selectors-<hash>"
  And commits the selector update in the spec file
  And opens a PR against the branch where the failure was detected
  And the PR body includes:
    - Which test was broken
    - The old selector and the new selector
    - Confidence score for the fix
    - A link to the failed test run

Scenario: Do not auto-fix low-confidence matches
  Given a selector break is detected but confidence is <80%
  Then no PR is created
  And the dashboard shows the suggestion with a "Manual review needed" tag
```

**Technical Notes**:
- Requires `contents:write` and `pull_requests:write` GitHub App permissions
- Branch naming avoids conflicts by including a short hash of the file+selector
- PR is created via the GitHub API using the installed GitHub App

---

#### TP-052: Confidence-Based Auto-Merge

**As** Priya (engineering manager), **I want** high-confidence selector fixes to be auto-merged, **so that** trivial selector updates do not require human review.

**Priority**: P1 (Phase 2)

**Acceptance Criteria**:

```gherkin
Scenario: Auto-merge high-confidence fix
  Given a fix PR has been created with confidence >95%
  And auto-merge is enabled in project settings (off by default)
  And CI checks pass on the fix PR
  Then the PR is automatically merged after a configurable delay (default: 10 minutes)
  And a notification is sent to the project channel

Scenario: Do not auto-merge when disabled
  Given auto-merge is not enabled in project settings
  Then fix PRs are created but require manual review and merge
```

**Technical Notes**:
- Auto-merge is opt-in per project, requiring explicit enablement
- A minimum delay (configurable, default 10 minutes) provides a window for human override
- Auto-merge only applies to PRs created by Motqen, never to user-created PRs

---

### Epic 7: Billing & Account (P0 - MVP)

#### TP-060: Free Tier with Usage Limits

**As** Marcus (full-stack developer), **I want to** use Motqen for free with reasonable limits, **so that** I can evaluate the product before committing to a paid plan.

**Priority**: P0

**Acceptance Criteria**:

```gherkin
Scenario: Free tier features and limits
  Given I sign up for a new Motqen account
  Then I am on the Free tier with these limits:
    | Feature             | Limit                    |
    | Cloud runs          | 50/month                 |
    | Users               | 1                        |
    | Projects            | 1                        |
    | Browsers            | Chromium only             |
    | Test result history | 7 days                   |
    | API key             | 1                        |
  And the CLI generate, record, and run commands work without limits locally

Scenario: Approaching free tier limit
  Given I have used 40/50 cloud runs this month
  When I run "motqen run --cloud"
  Then a warning in the terminal shows: "10 cloud runs remaining this month"
  And the run proceeds normally

Scenario: Free tier limit reached
  Given I have used 50/50 cloud runs this month
  When I run "motqen run --cloud"
  Then the run is rejected with a clear message
  And I am prompted to upgrade or wait until the next billing cycle
  And "motqen run" (local) continues to work without limits
```

**Technical Notes**:
- Usage resets on the 1st of each month (calendar month)
- Local CLI commands never have usage limits (OSS, MIT license)
- Usage is tracked per organization, not per user

---

#### TP-061: Team Subscription ($49/month)

**As** Sarah (tech lead), **I want to** upgrade to a Team plan for my small team, **so that** we get more cloud runs, multi-browser testing, and team collaboration features.

**Priority**: P0

**Acceptance Criteria**:

```gherkin
Scenario: Upgrade from Free to Team
  Given I am on the Free tier
  When I navigate to Settings > Billing
  And select the "Team" plan
  And enter payment information (credit card)
  And confirm the upgrade
  Then my organization is upgraded to the Team tier
  And I receive a confirmation email with receipt
  And the new limits take effect immediately:
    | Feature             | Team Limit                |
    | Cloud runs          | 500/month                 |
    | Users               | 3                         |
    | Projects            | 5                         |
    | Browsers            | Chromium, Firefox, WebKit |
    | Test result history | 30 days                   |
    | API keys            | 5                         |
    | PR comments         | Yes                       |

Scenario: Invite team members
  Given I am on the Team plan
  When I navigate to Settings > Team
  And invite a user by email
  Then they receive an invitation email
  And upon acceptance, they can access the organization's projects

Scenario: Monthly billing cycle
  Given I upgraded on January 15th
  Then I am charged $49 on January 15th
  And on February 15th, March 15th, etc.
  And prorated charges apply if I upgrade mid-cycle
```

**Technical Notes**:
- Payment processing via Stripe (subscriptions, invoices, webhooks)
- Seat-based with hard cap at 3 users on Team; additional seats available on Scale
- Upgrade/downgrade takes effect immediately; prorated to the minute

---

#### TP-062: Scale Subscription ($199/month)

**As** Priya (engineering manager), **I want to** subscribe to the Scale plan for my engineering organization, **so that** we have unlimited users, more cloud runs, and self-healing features.

**Priority**: P0

**Acceptance Criteria**:

```gherkin
Scenario: Upgrade to Scale plan
  Given I am on the Free or Team tier
  When I upgrade to the Scale plan
  Then my organization gets:
    | Feature             | Scale Limit               |
    | Cloud runs          | 5,000/month               |
    | Users               | Unlimited                 |
    | Projects            | Unlimited                 |
    | Browsers            | Chromium, Firefox, WebKit |
    | Test result history | 90 days                   |
    | API keys            | Unlimited                 |
    | PR comments         | Yes                       |
    | Self-healing PRs    | Yes (Phase 2)             |
    | Priority support    | Yes                       |

Scenario: Scale plan usage monitoring
  Given I am on the Scale plan
  When I navigate to Settings > Usage
  Then I see detailed usage breakdowns by project and user
  And projected monthly usage based on current pace
  And historical usage trends
```

**Technical Notes**:
- Scale plan includes priority support (email, <4hr response during business hours)
- Self-healing PRs are gated behind Scale plan, but the infrastructure is built in Phase 1
- Enterprise tier (custom pricing) is handled manually via sales contact form

---

#### TP-063: Usage Tracking and Billing

**As** Priya (engineering manager), **I want to** see my organization's usage and billing history, **so that** I can manage costs and justify the expense.

**Priority**: P0

**Acceptance Criteria**:

```gherkin
Scenario: View current usage
  Given I am on any paid plan
  When I navigate to Settings > Billing
  Then I see:
    - Current plan name and price
    - Cloud runs used / total this cycle
    - Next billing date
    - Payment method on file

Scenario: View billing history
  Given I have been subscribed for multiple months
  When I navigate to Settings > Billing > History
  Then I see a list of all invoices with date, amount, and status (paid/failed)
  And I can download each invoice as a PDF

Scenario: Cancel subscription
  Given I am on a paid plan
  When I click "Cancel Subscription"
  Then I am asked for a cancellation reason (optional)
  And I am informed my plan remains active until the end of the billing period
  And after the billing period ends, my organization downgrades to Free
  And my data is retained for 30 days after downgrade

Scenario: Failed payment handling
  Given my payment method fails
  Then I receive an email notification
  And my subscription enters a 7-day grace period
  And if not resolved, the subscription is cancelled
  And I retain read-only access to historical data
```

**Technical Notes**:
- Stripe handles all billing, invoicing, and payment retry logic
- Webhook from Stripe updates organization plan status in real-time
- Cancellation does not delete data immediately; 30-day retention period
- Usage overage: no automatic charges; hard cap at plan limit with upgrade prompt

---

## 4. Non-Functional Requirements

### 4.1 Performance

| Metric | Target | Notes |
|--------|--------|-------|
| CLI `generate` response time | <10 seconds for simple prompts, <30 seconds with URL crawl | Includes AI generation time |
| CLI `run` startup overhead | <2 seconds beyond native Playwright | Minimal wrapper overhead |
| Cloud run queue time | <30 seconds from trigger to first test executing | Cold start for container provisioning |
| Dashboard page load | <2 seconds (LCP) | Server-side rendering for initial load |
| API response time (non-generation) | <200ms P95 | Standard CRUD operations |
| API response time (generation) | <15s P95 | AI-dependent, with timeout at 60s |
| Concurrent cloud runs per organization | Up to 10 parallel containers | Scale plan |

### 4.2 Security

| Requirement | Implementation |
|-------------|----------------|
| Authentication | JWT with short-lived access tokens (15min), httpOnly refresh tokens (7d) |
| API key storage | SHA-256 hashed, raw key shown once at creation |
| Secrets in cloud runners | Injected as environment variables, never logged, purged with container |
| Data encryption | TLS 1.3 in transit, AES-256 at rest for test artifacts |
| GitHub permissions | Minimal scope: checks:write, pull_requests:write, contents:read |
| Test data isolation | Each organization's test data is logically isolated; cloud runners are physically isolated (separate containers) |
| SOC 2 readiness | Log all authentication events, API access, and data access for audit trail |
| Dependency scanning | Automated npm audit in CI; no known critical vulnerabilities |
| Rate limiting | 100 req/min per API key (CLI), 30 req/min per IP (dashboard) |

### 4.3 Scalability

| Target | Year 1 | Year 2 |
|--------|--------|--------|
| Registered organizations | 500 | 5,000 |
| Monthly cloud test runs | 50,000 | 500,000 |
| Concurrent cloud runners | 50 | 500 |
| Test result storage | 500 GB | 5 TB |
| API requests/day | 100,000 | 1,000,000 |

**Architecture decisions for scale**:
- Stateless API servers behind a load balancer
- Cloud runner queue (Redis/BullMQ) decouples API from execution
- Object storage (S3) for screenshots, traces, artifacts
- Database read replicas for dashboard queries
- CDN for static dashboard assets

### 4.4 Reliability

| Metric | Target |
|--------|--------|
| API uptime | 99.9% (43 minutes/month downtime budget) |
| Cloud runner availability | 99.5% (3.6 hours/month) |
| Data durability | 99.99% (daily backups, point-in-time recovery) |
| Mean time to recovery (MTTR) | <30 minutes for API, <1 hour for runners |

### 4.5 Accessibility

| Requirement | Standard |
|-------------|----------|
| Dashboard WCAG compliance | WCAG 2.1 AA |
| Keyboard navigation | All dashboard features accessible via keyboard |
| Screen reader support | Semantic HTML, ARIA labels on all interactive elements |
| Color contrast | Minimum 4.5:1 ratio for text, 3:1 for large text |
| CLI accessibility | Clear text output, no reliance on color alone (use symbols too) |

---

## 5. API Contract Overview

### 5.1 Authentication

All API requests require authentication via one of:
- **API Key**: `Authorization: Bearer tp_<key>` (CLI, GitHub Action)
- **JWT**: `Authorization: Bearer <jwt>` (Dashboard, after OAuth login)

### 5.2 Core API Endpoints

#### Test Generation

```
POST /api/v1/generate
Authorization: Bearer tp_<key>

Request Body:
{
  "prompt": "user can log in with email and password",
  "url": "http://localhost:3000/login",     // optional, for page context
  "pageContext": { ... },                    // optional, DOM snapshot
  "config": {
    "selectorStrategy": ["data-testid", "role", "text", "css"],
    "baseUrl": "http://localhost:3000"
  }
}

Response 200:
{
  "code": "import { test, expect } from '@playwright/test';\n\n...",
  "filename": "user-can-log-in.spec.ts",
  "confidence": 85,
  "warnings": [],
  "tokensUsed": 1234
}

Response 429: { "error": "Rate limit exceeded", "retryAfter": 60 }
Response 401: { "error": "Invalid or expired API key" }
```

#### Test Runs

```
POST /api/v1/runs
Authorization: Bearer tp_<key>

Request Body:
{
  "projectId": "proj_abc123",
  "branch": "feature/checkout",
  "commit": "abc1234def5678",
  "source": "cli" | "github-action" | "dashboard",
  "browsers": ["chromium", "firefox", "webkit"],
  "testFiles": [ ... ]  // Base64-encoded test file contents
}

Response 202:
{
  "runId": "run_xyz789",
  "status": "queued",
  "estimatedStart": "2026-02-02T10:00:30Z",
  "streamUrl": "/api/v1/runs/run_xyz789/stream"
}
```

```
GET /api/v1/runs/:runId
Authorization: Bearer tp_<key>

Response 200:
{
  "runId": "run_xyz789",
  "status": "completed",
  "startedAt": "2026-02-02T10:00:32Z",
  "completedAt": "2026-02-02T10:03:06Z",
  "duration": 154,
  "results": {
    "total": 20,
    "passed": 19,
    "failed": 1,
    "skipped": 0
  },
  "browsers": {
    "chromium": { "passed": 19, "failed": 1 },
    "firefox": { "passed": 20, "failed": 0 },
    "webkit": { "passed": 20, "failed": 0 }
  },
  "failures": [
    {
      "testName": "checkout > completes purchase",
      "file": "tests/checkout.spec.ts",
      "browser": "chromium",
      "error": "Timeout waiting for selector ...",
      "screenshotUrl": "https://cdn.motqen.dev/...",
      "traceUrl": "https://cdn.motqen.dev/...",
      "category": "selector_broken"
    }
  ]
}
```

#### Streaming Run Progress

```
GET /api/v1/runs/:runId/stream
Authorization: Bearer tp_<key>
Accept: text/event-stream

Response (SSE):
event: test_start
data: { "testName": "login > email password", "browser": "chromium" }

event: test_pass
data: { "testName": "login > email password", "browser": "chromium", "duration": 3420 }

event: test_fail
data: { "testName": "checkout > completes purchase", "browser": "chromium", "error": "..." }

event: run_complete
data: { "runId": "run_xyz789", "status": "completed", "results": { ... } }
```

#### Projects

```
GET    /api/v1/projects                    # List projects for organization
POST   /api/v1/projects                    # Create project
GET    /api/v1/projects/:id                # Get project details
PATCH  /api/v1/projects/:id                # Update project settings
DELETE /api/v1/projects/:id                # Delete project

GET    /api/v1/projects/:id/runs           # List runs for project
GET    /api/v1/projects/:id/analytics      # Get analytics data
```

#### API Keys

```
GET    /api/v1/api-keys                    # List API keys (masked)
POST   /api/v1/api-keys                    # Generate new key (returns raw key once)
DELETE /api/v1/api-keys/:id                # Revoke key
```

#### Organizations & Billing

```
GET    /api/v1/organization                # Get org details
PATCH  /api/v1/organization                # Update org settings
GET    /api/v1/organization/usage          # Get usage metrics
GET    /api/v1/organization/billing        # Get billing info
POST   /api/v1/organization/billing/subscribe  # Create/change subscription
POST   /api/v1/organization/billing/cancel     # Cancel subscription
GET    /api/v1/organization/members        # List members
POST   /api/v1/organization/members/invite # Invite member
DELETE /api/v1/organization/members/:id    # Remove member
```

### 5.3 Webhook Schemas (Outbound)

Motqen sends webhooks to user-configured URLs for key events.

```
POST <user-configured-url>
Content-Type: application/json
X-Motqen-Signature: sha256=<hmac>

{
  "event": "run.completed",
  "timestamp": "2026-02-02T10:03:06Z",
  "data": {
    "runId": "run_xyz789",
    "projectId": "proj_abc123",
    "status": "failed",
    "results": {
      "total": 20,
      "passed": 19,
      "failed": 1
    },
    "dashboardUrl": "https://app.motqen.dev/runs/run_xyz789"
  }
}
```

**Webhook events**:
- `run.started` - Cloud run has begun execution
- `run.completed` - Cloud run finished (includes results summary)
- `run.failed` - Cloud run failed to execute (infrastructure error)
- `subscription.updated` - Plan changed
- `usage.threshold` - Usage approaching limit (80%, 100%)

### 5.4 CLI-to-Cloud Protocol

1. **Authentication**: CLI reads API key from `MOTQEN_API_KEY` env var or `motqen.config.ts`
2. **Generation**: `motqen generate` sends POST to `/api/v1/generate`, receives generated code
3. **Cloud Run**: `motqen run --cloud` packages test files, sends POST to `/api/v1/runs`, then connects to SSE stream for progress
4. **Local Run**: `motqen run` (no `--cloud`) executes Playwright locally, optionally uploads results to `/api/v1/runs` if `cloudReporting` is enabled
5. **Rate Limiting**: 100 req/min per API key; CLI implements exponential backoff on 429 responses

---

## 6. Data Model Overview

### 6.1 Entity Relationship Diagram (Conceptual)

```
Organization (1) ──── (N) User
     │
     │ (1:N)
     ▼
  Project (1) ──── (1) GitHubRepository
     │
     │ (1:N)
     ▼
  TestRun (1) ──── (N) TestResult
     │                    │
     │                    │ (1:N)
     │                    ▼
     │               TestArtifact (screenshot, trace)
     │
     ▼
  TestFile (tracked for self-healing)
     │
     ▼
  SelectorHistory (Phase 2)
```

### 6.2 Key Entities

#### Organization

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| name | String | Display name |
| slug | String | URL-safe identifier, unique |
| plan | Enum | free, team, scale, enterprise |
| stripeCustomerId | String | Nullable, set when billing is configured |
| monthlyRunLimit | Integer | Derived from plan |
| runsUsedThisMonth | Integer | Reset on 1st of each month |
| createdAt | DateTime | |
| updatedAt | DateTime | |

#### User

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| email | String | Unique |
| name | String | |
| githubId | String | Nullable, set for GitHub OAuth users |
| avatarUrl | String | From GitHub or Gravatar |
| passwordHash | String | Nullable, null for OAuth-only users |
| organizationId | UUID | Foreign key to Organization |
| role | Enum | owner, admin, member |
| createdAt | DateTime | |

#### ApiKey

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| keyHash | String | SHA-256 hash of the raw key |
| keyPrefix | String | First 8 characters (tp_xxxx) for identification |
| description | String | User-provided label |
| organizationId | UUID | Foreign key |
| createdByUserId | UUID | Foreign key |
| lastUsedAt | DateTime | Nullable |
| revokedAt | DateTime | Nullable, set when revoked |
| createdAt | DateTime | |

#### Project

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| name | String | Repository name or custom name |
| organizationId | UUID | Foreign key |
| githubRepoId | String | GitHub repository ID |
| githubRepoFullName | String | e.g., "acme/web-app" |
| githubInstallationId | String | GitHub App installation ID |
| defaultBranch | String | e.g., "main" |
| settings | JSONB | Project-level config overrides |
| createdAt | DateTime | |

#### TestRun

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| projectId | UUID | Foreign key |
| status | Enum | queued, running, completed, failed, cancelled |
| source | Enum | cli, github_action, dashboard |
| branch | String | Git branch name |
| commitSha | String | Git commit hash |
| browsers | String[] | Array of browser names |
| totalTests | Integer | |
| passedTests | Integer | |
| failedTests | Integer | |
| skippedTests | Integer | |
| duration | Integer | Milliseconds |
| startedAt | DateTime | Nullable |
| completedAt | DateTime | Nullable |
| createdAt | DateTime | |

#### TestResult

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| testRunId | UUID | Foreign key |
| testName | String | Full test name including describe block |
| filePath | String | Path to spec file |
| browser | String | chromium, firefox, or webkit |
| status | Enum | passed, failed, skipped |
| duration | Integer | Milliseconds |
| errorMessage | String | Nullable, populated on failure |
| errorStack | String | Nullable |
| failureCategory | Enum | Nullable: selector_broken, assertion_failed, timeout, network, flaky, infrastructure |
| retries | Integer | Number of retry attempts |
| createdAt | DateTime | |

#### TestArtifact

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| testResultId | UUID | Foreign key |
| type | Enum | screenshot, trace, video, log |
| storageUrl | String | URL in object storage |
| sizeBytes | Integer | |
| createdAt | DateTime | |

#### Subscription (via Stripe)

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| organizationId | UUID | Foreign key |
| stripeSubscriptionId | String | Stripe subscription ID |
| plan | Enum | team, scale |
| status | Enum | active, past_due, cancelled, trialing |
| currentPeriodStart | DateTime | |
| currentPeriodEnd | DateTime | |
| cancelledAt | DateTime | Nullable |
| createdAt | DateTime | |

---

## 7. Out of Scope (Phase 1)

The following are explicitly excluded from Phase 1 MVP and deferred to Phase 2+:

| Feature | Phase | Notes |
|---------|-------|-------|
| Self-healing selector fix PRs | Phase 2 | Infrastructure laid in Phase 1 (failure categorization), execution in Phase 2 |
| Auto-merge of fix PRs | Phase 2 | Requires high confidence in self-healing first |
| Visual regression testing | Phase 2 | Screenshot comparison, pixel-diff |
| API/integration test generation | Phase 2 | Phase 1 focuses on UI E2E tests only |
| Mobile browser testing | Phase 2 | Playwright mobile emulation is supported; real device testing is not |
| Custom LLM provider support | Phase 2 | Phase 1 uses Claude only; Phase 2 may add OpenAI, local models |
| On-premise deployment | Phase 3 | Enterprise-only feature |
| SSO/SAML authentication | Phase 2 | Enterprise requirement |
| Slack/Teams notifications | Phase 2 | Webhook-based notifications cover MVP needs |
| Test generation from Figma designs | Phase 3 | Aspirational feature for design-to-test pipeline |
| Multi-language support (non-English prompts) | Phase 2 | Phase 1 is English-only |

---

## 8. Success Metrics

### 8.1 Business KPIs (MVP Launch + 3 months)

| Metric | Target | Measurement |
|--------|--------|-------------|
| GitHub stars (CLI repo) | 1,000 in 3 months | GitHub API |
| npm installs (CLI) | 5,000 total in 3 months | npm stats |
| Registered organizations | 500 | Database count |
| Paid conversions (Free to Team/Scale) | 5% conversion rate | Stripe data |
| Monthly Recurring Revenue (MRR) | $5,000 by month 3 | Stripe dashboard |
| Monthly churn (paid plans) | <8% | Stripe + internal tracking |

### 8.2 Product KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to first test generated | <2 minutes from install | CLI telemetry (opt-in) |
| Test generation success rate | >90% (generates valid, runnable test) | API logs |
| Cloud run success rate | >95% (no infrastructure failures) | Run status tracking |
| Average confidence score | >70% | Generation API responses |
| Tests generated per user per month | >10 (engaged users) | API key usage logs |
| Dashboard MAU | >40% of registered users | Analytics |

### 8.3 User Experience KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| NPS (Net Promoter Score) | >50 | In-app survey at day 14 |
| CLI satisfaction rating | >4.5/5 | Post-generate prompt (opt-in) |
| Support tickets per 100 users | <5/month | Support system |
| Documentation completeness | >90% of features documented | Manual audit |
| Time to resolve support tickets | <24 hours (business days) | Support system |

### 8.4 Technical KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| API uptime | 99.9% | Monitoring (UptimeRobot / Checkly) |
| API P95 latency (non-generation) | <200ms | APM (Datadog / custom) |
| Cloud runner cold start | <30 seconds | Runner queue metrics |
| Zero critical security vulnerabilities | 0 | npm audit + Snyk |
| Test coverage (our own code) | >80% | Jest coverage reports |

---

## 9. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| AI generates incorrect/broken tests | High | Medium | Confidence scoring, warnings, always-human-reviewed output. Tests are standard Playwright -- users run them before trusting. |
| Cloud runner cost exceeds revenue | Medium | High | Start with generous but finite free tier. Monitor cost-per-run closely. Use spot instances for non-priority runs. |
| GitHub App permission concerns | Medium | Medium | Request minimal permissions. Publish a clear privacy policy. Allow read-only mode. |
| LLM API costs spike | Medium | Medium | Cache common patterns, optimize prompts, set per-org generation limits. |
| Playwright releases breaking change | Low | Medium | Pin Playwright version in runners. Test against Playwright beta before upgrading. |
| Competitor launches similar product | Medium | Low | Open-source CLI creates lock-in through community. Standard Playwright output prevents vendor lock-in for users (paradoxically building trust). |

---

## 10. Timeline (8-Week MVP)

| Week | Milestone | Deliverables |
|------|-----------|-------------|
| 1 | Foundation | Project scaffolding, CI/CD, database schema, auth (TP-001, TP-005, TP-020) |
| 2 | CLI Core | `motqen init`, `motqen generate` basic flow (TP-002) |
| 3 | AI Engine | Test generation for auth, CRUD, forms, navigation (TP-010 through TP-013) |
| 4 | CLI Complete | `motqen record`, `motqen run`, confidence scoring (TP-003, TP-004, TP-014, TP-015) |
| 5 | Cloud Platform | Cloud runner, GitHub integration, run execution (TP-021, TP-022) |
| 6 | CI/CD + Dashboard | GitHub Action, PR checks, PR comments, results dashboard (TP-023, TP-030, TP-031, TP-032) |
| 7 | Billing + Polish | Stripe integration, API keys, usage tracking (TP-024, TP-060 through TP-063) |
| 8 | Analytics + Launch | Dashboard analytics, landing page, docs, launch prep (TP-040 through TP-043) |

---

## Appendix A: Glossary

| Term | Definition |
|------|-----------|
| Cloud run | A test execution performed on Motqen's cloud infrastructure |
| Confidence score | A 0-100% rating of how likely a generated test is to work correctly |
| Self-healing | The process of automatically detecting and fixing broken test selectors via PRs |
| Selector strategy | The prioritized list of selector types Motqen uses when generating tests |
| Spec file | A Playwright test file (`.spec.ts`) |
| Test artifact | A file produced during test execution (screenshot, trace, video) |

## Appendix B: Competitive Landscape

| Feature | Motqen | Cypress Cloud | Playwright (native) | Testim | Mabl |
|---------|-----------|---------------|---------------------|--------|------|
| AI test generation | Yes (NL prompt) | No | No | Yes (proprietary) | Yes (proprietary) |
| Standard output format | Playwright .spec.ts | Cypress .cy.js | Playwright .spec.ts | Proprietary | Proprietary |
| OSS CLI | Yes (MIT) | Partial (core OSS) | Yes (Apache) | No | No |
| Cloud execution | Yes | Yes ($150+/mo) | No | Yes | Yes |
| Self-healing | Yes (via PRs) | No | No | Yes (runtime) | Yes (runtime) |
| GitHub native | Yes (App + Action) | Limited | No | Limited | Limited |
| Starting price | $0 (free tier) | $150/mo | $0 | Custom | Custom |
