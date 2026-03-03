---
name: presentation
description: "Use when the user asks to create a presentation, demo deck, or PDF slideshow from a running product or documentation. Examples: 'create a presentation for the portal', 'make a PDF demo for the manager', 'build a slide deck from screenshots', 'generate an executive presentation'"
---

# Presentation Generator Skill

## When to Use

- "Create a presentation for [product]"
- "Make a PDF demo for [audience]"
- "Build a slide deck with screenshots"
- "Generate an executive presentation from the portal"
- "Demo [product] to [stakeholder]"

## Workflow

```
1. ENSURE the product is running (check port, start if needed)
2. GATHER content from docs (PRD, business-analysis, ADRs)
3. CAPTURE screenshots via Playwright script (visits all pages in correct flow)
4. WRITE HTML presentation (slides as A4 landscape pages with CSS print layout)
5. GENERATE PDF via Playwright page.pdf()
6. OPEN the PDF for review
```

## Step-by-Step Protocol

### 1. Ensure Product is Running

```bash
# Check if port is occupied
lsof -i :<PORT> | grep LISTEN

# If not running, install deps and start
cd products/<name>/apps/web && pnpm install && pnpm dev &

# Wait for ready
curl -s -o /dev/null -w "%{http_code}" http://localhost:<PORT>
# Should return 200
```

### 2. Discover All Pages

```bash
find products/<name>/apps/web -name "page.tsx" | sort
```

### 3. Read Key Documentation

Always extract these sections from docs:
- `docs/PRD.md` → §1 Product Overview, §1.3 Business Context, §1.5 Success Metrics
- `docs/business-analysis.md` → §1 Executive Summary, §2.1 Problem Statement
- `docs/ARCHITECTURE.md` → integration points, tech stack

### 4. Write Playwright Screenshot + PDF Script

Create `products/<name>/scripts/generate-presentation.mjs`:

```js
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '../docs/presentation');
mkdirSync(OUT_DIR, { recursive: true });
const BASE = 'http://localhost:<PORT>';

async function shot(page, name) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(OUT_DIR, `${name}.png`), fullPage: false });
}

async function run() {
  // Phase 1: Screenshots
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 820 } });
  const page = await ctx.newPage();

  // Navigate through demo flow, taking screenshots at each step
  // Use demo/mock data — the portal must expose a demo path
  await page.goto(BASE);
  await shot(page, '01-login');
  // ... navigate through each page ...
  await browser.close();

  // Phase 2: HTML → PDF
  const htmlPath = join(OUT_DIR, 'presentation.html');
  writeFileSync(htmlPath, buildHTML()); // see HTML template below

  const browser2 = await chromium.launch({ headless: true });
  const page2 = await browser2.newPage();
  await page2.goto(`file://${htmlPath}`, { waitUntil: 'networkidle' });
  await page2.pdf({
    path: join(OUT_DIR, '<ProductName>-Presentation.pdf'),
    format: 'A4', landscape: true, printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });
  await browser2.close();
}

run().catch(e => { console.error(e); process.exit(1); });
```

### 5. HTML Presentation Template Structure

Each slide is `<div class="slide">` with:
- `width: 297mm; height: 210mm` (A4 landscape)
- `page-break-after: always`
- No margin/padding on body

**Required Slides for an Executive Demo:**

| Slide | Content |
|-------|---------|
| 1 | Cover — product name, audience, date, classification |
| 2 | Problem Statement — from PRD §1.3 / BA §2.1 |
| 3 | Solution Overview — flow diagram + key stats |
| 4–N | Portal Walkthrough — 2 screenshots per slide with annotations |
| N+1 | Admin/Internal View — admin dashboard screenshot |
| N+2 | Integrations — table of all external systems |
| N+3 | Success Metrics — before/after comparison table |
| N+4 | Technology Stack + Delivery Timeline |
| Last | Closing — Next Steps + Recommendation |

### 6. CSS Rules for Print-Perfect Slides

```css
.slide {
  width: 297mm;
  height: 210mm;
  page-break-after: always;
  page-break-inside: avoid;
  overflow: hidden;
  background: #fff;
}
/* Never exceed 210mm height — content will be clipped in PDF */
/* Use flexbox with fixed heights, not auto heights */
/* Embed images as relative paths (same folder as HTML) */
```

### 7. Run the Script

```bash
cd products/<name>
node scripts/generate-presentation.mjs
```

### 8. Open for Review

```bash
open docs/presentation/<ProductName>-Presentation.pdf
```

---

## Slide Design Patterns

### Colour Palette (ConnectSW standard)
```css
--navy: #0a2240;
--gold: #c9a227;
--teal: #0e7490;
--green: #15803d;
--red: #dc2626;
```

### Screenshot Frame Component
```html
<div class="screen-frame">
  <div class="bar">
    <span class="r"></span><span class="y"></span><span class="g"></span>
    <div class="url">localhost:PORT/path</div>
  </div>
  <img src="XX-screenshot.png" alt="description"/>
</div>
```

### Stat Block
```html
<div class="stat">
  <div class="value">500+</div>
  <div class="label">Applications per week</div>
</div>
```

### Before/After Comparison
Use two-column grid with red-tinted left card (before) and green-tinted right card (after).

---

## Audience-Specific Guidance

| Audience | Emphasis | Slides to Expand |
|----------|----------|-----------------|
| Senior Manager (Digital) | Problem urgency, portal walkthrough, delivery timeline | Problem Statement, Walkthrough, Delivery |
| CTO / Architect | Tech stack, integrations, security, data residency | Integrations, Architecture |
| CEO / Board | Business case, ROI, throughput numbers | Problem, Metrics, Recommendation |
| Operations / QDB RM | Admin dashboard, case management workflow | Admin view, CRM integration |
| Compliance / Risk | Audit trail, duplicate prevention, data security | Integrations, Security details |

---

## Common Pitfalls

- **Session state**: The portal must expose a `/demo` or auto-login path for Playwright to traverse authenticated pages. Check `localStorage` or cookies for demo flags.
- **Page height overflow**: If a slide has too much content it will be clipped. Use `max-height` on screenshot containers.
- **Font loading**: Use system fonts or inline @font-face — Google Fonts won't load in `file://` context without network.
- **Image paths**: Always use relative paths in HTML (same directory as the HTML file).
- **PDF margins**: Set all margins to 0 in `page.pdf()` — otherwise slides get extra whitespace.

---

## File Output Structure

```
products/<name>/
├── scripts/
│   └── generate-presentation.mjs
└── docs/
    └── presentation/
        ├── 01-login.png
        ├── 02-dashboard.png
        ├── ...
        ├── presentation.html
        └── <ProductName>-Presentation.pdf  ← final deliverable
```
