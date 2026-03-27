# Browser Automation Protocol

**Version**: 1.0.0
**Created**: 2026-03-27
**Inspired by**: gstack `/browse` — persistent Chromium daemon with sub-second latency
**Applies to**: QA Engineer, Frontend Engineer, UI/UX Designer, Support Engineer

---

## Purpose

Enable real browser interaction for live QA, visual regression testing, design review, and auth flow verification. This protocol strengthens the **Browser-First Gate** (Article X) by replacing manual checks with automated, reproducible browser sessions.

## Architecture

### Persistent Browser Daemon

```
┌─────────────┐     HTTP/JSON      ┌──────────────────┐
│ Claude Code  │ ◄──────────────► │ Chromium Daemon    │
│ (Agent)      │   localhost:PORT  │ (Playwright)       │
└─────────────┘                    │ - Persistent state │
                                   │ - Cookie sessions  │
                                   │ - Ring buffers     │
                                   └──────────────────┘
```

**Key Properties:**
- **Persistent**: Browser stays running between commands (no cold-start per action)
- **Localhost-only**: Binds to `127.0.0.1` with Bearer token auth
- **Isolated**: Each product gets its own browser context (no cookie collisions)
- **Auto-shutdown**: Idle timeout after 30 minutes

### Setup

```bash
# Install Playwright browsers (one-time)
npx playwright install chromium

# Start daemon for a product
npx playwright-daemon start --port $BROWSER_PORT --product $PRODUCT
```

**Port Allocation** (extends PORT-REGISTRY.md):
- Browser daemon ports: **9100-9199** (one per product, matching product index)

## Commands

### Navigation & Interaction

| Command | Description | Latency |
|---------|-------------|---------|
| `browse:navigate <url>` | Navigate to URL | ~500ms |
| `browse:click <selector>` | Click element | ~100ms |
| `browse:type <selector> <text>` | Type into input | ~100ms |
| `browse:screenshot [name]` | Capture full page | ~200ms |
| `browse:screenshot-element <selector>` | Capture element | ~150ms |
| `browse:wait <selector>` | Wait for element | variable |
| `browse:evaluate <js>` | Run JS in page context | ~50ms |

### State Inspection

| Command | Description |
|---------|-------------|
| `browse:console` | Show recent console output (ring buffer, 50K entries) |
| `browse:network` | Show recent network requests (ring buffer, 50K entries) |
| `browse:cookies` | List cookies for current domain |
| `browse:accessibility` | Dump accessibility tree |
| `browse:refs` | List interactive elements via accessibility selectors |

### Session Management

| Command | Description |
|---------|-------------|
| `browse:import-cookies <browser>` | Import session from Chrome/Arc/Brave/Edge |
| `browse:new-context <name>` | Create isolated browser context |
| `browse:switch-context <name>` | Switch between contexts |
| `browse:handoff` | Open headed browser for human intervention (CAPTCHAs, complex auth) |

## Reference System (@refs)

Instead of fragile CSS selectors, use **accessibility-based references**:

```
# List interactive elements
browse:refs

# Output:
# @1 [button] "Sign In"
# @2 [input] "Email address"
# @3 [link] "Forgot password?"

# Use refs in commands
browse:click @1
browse:type @2 "user@example.com"
```

**Properties:**
- Built on Playwright's accessibility tree (no DOM injection)
- Survives framework hydration and CSP restrictions
- References reset on navigation (staleness detection via `count()`)

## Cookie Import for Auth Testing

Import real browser sessions to test authenticated flows:

```bash
# Import from Chrome (macOS)
browse:import-cookies chrome

# Import from specific browser
browse:import-cookies arc
browse:import-cookies brave
browse:import-cookies edge

# Import for specific domain only
browse:import-cookies chrome --domain myapp.localhost
```

**Security:**
- Cookies decrypted in-memory only (never plaintext on disk)
- Native SQLite reads browser cookie databases directly
- Sessions isolated per product context

## Integration with Quality Gates

### Browser-First Gate Enhancement

The Browser-First Gate (Article X) now includes automated verification:

```markdown
## Browser-First Gate Checklist

### Manual (existing)
- [ ] Application loads without errors
- [ ] Core user flows work end-to-end
- [ ] Responsive design verified at 3 breakpoints

### Automated (new — via browser daemon)
- [ ] `browse:navigate` succeeds for all main routes
- [ ] `browse:console` shows no uncaught errors
- [ ] `browse:network` shows no failed API calls (4xx/5xx)
- [ ] `browse:accessibility` tree has no missing labels
- [ ] `browse:screenshot` captured for visual baseline
```

### Visual Regression Testing

```bash
# Capture baseline screenshots
browse:screenshot --name "dashboard-baseline"
browse:screenshot --name "profile-baseline"

# After changes, compare
browse:screenshot --name "dashboard-after"
# Diff generated automatically in .claude/deliverables/visual-diffs/
```

## Ring Buffers

Three circular buffers capture runtime data without memory pressure:

| Buffer | Capacity | Captures |
|--------|----------|----------|
| Console | 50,000 entries | `console.log/warn/error`, uncaught exceptions |
| Network | 50,000 entries | URL, method, status, timing, size |
| Dialog | 50,000 entries | `alert()`, `confirm()`, `prompt()` events |

## Human Handoff

For scenarios requiring human intervention (CAPTCHAs, OAuth consent screens, MFA):

```bash
# Opens headed browser window, pauses automation
browse:handoff

# Human completes auth flow, then:
browse:resume
# Session cookies now available to automation
```

## When to Use

| Scenario | Use Browser Automation? |
|----------|----------------------|
| QA testing a running app | Yes — `browse:navigate` + `browse:click` + `browse:screenshot` |
| Visual regression check | Yes — screenshot comparison |
| Auth flow testing | Yes — `browse:import-cookies` or `browse:handoff` |
| Design review | Yes — `browse:screenshot` + accessibility audit |
| API-only testing | No — use Jest integration tests |
| Unit testing | No — use Jest |
| E2E test writing | Maybe — use for exploration, then codify in Playwright spec |

## Enforcement

- **QA Engineer**: MUST use browser automation during Testing Gate for all products with a frontend
- **Frontend Engineer**: SHOULD use during development for visual verification
- **UI/UX Designer**: MUST use for design review audits (see `design-review.md`)
- **Support Engineer**: SHOULD use when investigating frontend bugs
