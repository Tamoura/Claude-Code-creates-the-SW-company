# ADR-006: Designer Canvas — React Flow (`@xyflow/react`), Not bpmn-js

**Product**: ConnectBPM · **Task**: ARCH-01 · **Date**: 2026-08-20
**Author**: Architect, ConnectSW

## Status

Accepted.

## Context

The visual process designer (SPEC-01 G-13, ~3 sprints) needs a canvas: draggable nodes, connectable
edges, pan/zoom, selection, keyboard operation, and validation highlighting. Three requirements shape
the choice beyond the obvious ones:

| # | Requirement | Source |
|---|-------------|--------|
| C1 | The palette offers **exactly E1–E7** and no other element type may be created through any interface | `FR-011` |
| C2 | The canvas **mirrors in RTL** — flow direction, connector routing and arrowheads — and a LTR/RTL screenshot pair is the story's acceptance artifact | `FR-141`, `AC-060`, `NFR-013` |
| C3 | Validation failures **name the offending element and highlight it on the canvas**; generic failure messages are non-compliant | `FR-017` |
| C4 | WCAG 2.1 AA in both directions; the product must be operable by keyboard | `NFR-012` |

## Research

| Candidate | Licence (checked 2026-08-20) | Maintenance | Verdict |
|-----------|------------------------------|-------------|---------|
| **bpmn-js** | **bpmn.io licence** — permissive *except* that "the source code responsible for displaying the bpmn.io project watermark that links back to https://bpmn.io … MUST NOT be removed or changed" and must "stay fully visible and not visually overlapped" | Very active (Camunda) | **Rejected.** Three independent reasons, any one sufficient. (1) A permanent, non-removable watermark linking to **a competitor's project** sits on the primary authoring surface of a commercial SaaS whose go-to-market includes Camunda migrations. (2) It is a BPMN 2.0 editor: its palette is the BPMN element set, so `FR-011` becomes a fight against the library's purpose rather than a property of it. (3) No RTL mirroring; the diagram model and rendering assume left-to-right, and `AC-060` is a v1 acceptance criterion. |
| **React Flow — `@xyflow/react` v12** | **MIT** — explicitly free for commercial use; optional Pro subscription buys examples and support, not rights | Very active; the Pro/sponsorship model funds an MIT core | **Adopted.** Nodes are ordinary React components, so E1–E7 are seven components and *nothing else is expressible* — C1 is satisfied by construction. Pan/zoom, selection, multi-select, connection validation, minimap and controls are built in. Node positions are our data, so RTL mirroring is a coordinate transform we own (see below). Accessible node/edge focus is supported and extendable. |
| **JointJS** | Core is open source; **JointJS+** (the diagramming features actually wanted) is commercial per-developer | Active | Rejected: the capability we would use lives behind the commercial tier, and the open core is a lower-level SVG toolkit — comparable effort to React Flow with a licence question attached. |
| **mxGraph / maxGraph** | Apache-2.0 | mxGraph archived (2020); maxGraph is the successor, smaller community | Rejected: mxGraph is dead; maxGraph does not yet justify the ecosystem risk against an MIT library with a large install base. |
| **Custom SVG / Konva** | — | — | Rejected: total control at a cost of several sprints re-deriving pan/zoom, hit-testing, edge routing and selection. React Flow is the composition answer Article II asks for. |
| **elkjs** (auto-layout, complementary) | EPL-2.0 | Active | **Adopted for one narrow job**: laying out a template on install (`FR-153`) and on future BPMN import, so an installed template opens tidy rather than stacked at the origin. Used as a dependency; EPL-2.0's file-level reciprocity does not reach our code. `dagre` was considered and rejected on maintenance. |

## Decision

**`@xyflow/react` (React Flow v12, MIT)** for the designer canvas, with:

1. **Seven node components**, one per element, each rendering the element's own affordances
   (E2 Step shows its assignment rule; E3 Decision shows one handle per condition plus the mandatory
   default; E5 renders as a boundary badge attached to its Step, not as a free node). The node type
   registry is a closed map — an unknown `type` renders an error node and fails validation. `FR-011`
   is a property of the type registry, not a rule someone must remember.
2. **The canvas edits our own graph model**, not a library-shaped one. React Flow's
   `nodes`/`edges` are a *projection* of `ProcessDefinitionVersion.graph`; publish serialises our
   model, and the checksum (`FR-015`) is computed over our model, so a library upgrade cannot change a
   published checksum.
3. **RTL by coordinate transform, never by CSS mirroring** (`FR-141`, `AC-060`). This is the trap
   worth naming: `transform: scaleX(-1)` on the pane mirrors the *text* too, producing reversed
   Arabic labels. Instead, in `ar` the canvas maps `x → (canvasWidth − x)` when projecting our graph
   into React Flow, swaps source/target handle sides, and re-renders arrowheads from the transformed
   geometry. Node internals render normally with `dir="rtl"` and logical CSS properties. Layout
   direction is a projection concern; stored coordinates stay canonical and direction-independent, so
   the same definition opens correctly in either locale.
4. **Validation highlighting** (`FR-017`, `C3`): publish-time validation returns
   `{ elementId, rule, message }[]`; the canvas maps `elementId` to node id and applies an error
   state plus a focusable error list. Because our model owns element ids, this survives library
   changes.
5. **Keyboard operation** (`C4`): a node list panel provides a fully keyboard-navigable alternative
   to pointer manipulation (select element, connect to element, set property), so the designer is
   operable without a pointer even though the canvas is a spatial surface. The **single-task view**,
   which `NFR-012` requires to be fully keyboard-operable, contains no canvas at all.

## Consequences

### Positive
- MIT, no watermark, no competitor branding on our primary authoring surface, no per-developer fee.
- `FR-011` is enforced by a closed component registry rather than by suppressing another library's palette.
- The stored graph is ours, so the canvas library is replaceable without a data migration.
- RTL is achievable in v1 because we own the coordinate projection — the exact thing bpmn-js does not
  give up.

### Negative
- BPMN visual conventions (diamond gateways, circle events, the standard iconography) must be drawn
  by us. This is ~1 sprint of node components and is also an opportunity: seven custom shapes read
  more clearly to an ops analyst than the full BPMN vocabulary, which is the point of the element set.
- Edge routing is basic out of the box. Orthogonal routing around nodes is custom work; v1 ships
  smoothstep edges with manual waypoint support deferred.
- BPMN import (BN-017) will need a bpmn-moddle-based parser feeding our model. That is a Phase 2
  mapping layer and does not require bpmn-js rendering.

### Neutral
- React Flow Pro is not purchased; it grants examples and support, not licence rights.

## References
- bpmn.io licence — https://bpmn.io/license/ (watermark clause) · https://github.com/bpmn-io/bpmn-js/blob/main/LICENSE
- React Flow — https://github.com/xyflow/xyflow (MIT) · https://xyflow.com/open-source
- `FR-011`, `FR-015`, `FR-017`, `FR-141`, `FR-153`; `NFR-012`, `NFR-013`; `AC-059`, `AC-060`, `AC-067`
- `.claude/protocols/i18n.md`; precedent products `connectin`, `muaththir`
