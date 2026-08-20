# ConnectBPM E2E tests

## Layout (required by `.claude/scripts/traceability-gate.sh`, Article VI)

```
tests/
  foundation-smoke.spec.ts     # infrastructure-level, not story-bound
  stories/
    US-07/                     # one directory per user story ID from docs/PRD.md
      task-inbox.spec.ts
```

A spec that verifies a story goes under `stories/<story-id>/`. A spec name
should carry the acceptance-criteria ID it covers (`AC-049`, `FR-069`) so the
traceability gate can match it.

## Required projects

| Project        | Why it exists |
|----------------|---------------|
| `chromium`     | The baseline suite. |
| `chromium-rtl` | Arabic locale (DEC-001). A layout that only works LTR fails here, not in review. |
| `mobile`       | NFR-003 — single-task view interactive ≤ 2.0 s on 4G / 375 px. |

## Isolation suite (AC-049 / AC-050)

The cross-tenant suite is **not** hand-maintained. It enumerates endpoints from
the generated OpenAPI document and requests each one as a member of tenant A
using tenant B's identifiers, asserting 404 and no leaked value. A new endpoint
is therefore covered automatically, and an endpoint missing from the OpenAPI
document fails the build (ADR-004 §4).
