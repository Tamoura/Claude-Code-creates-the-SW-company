# ADR-003: Internationalization Approach

## Status

Proposed

## Context

DealGate is a bilingual platform serving Qatar's population: 12% Qatari
nationals (Arabic-primary) and 88% expatriates (English-primary, with South
Asian, Filipino, and other language backgrounds). The platform must support:

- **Arabic (RTL)** and **English (LTR)** as equal-priority languages
- RTL layout that mirrors the entire UI (navigation, forms, tables, icons)
- ICU message format for pluralization and number formatting
- Both Western Arabic numerals (0-9) and Eastern Arabic numerals (Arabic-Indic)
- Hijri and Gregorian calendar display
- QAR currency formatting in both locales
- SEO-friendly URL-based locale routing (`/en/deals`, `/ar/deals`)
- Server-side rendering support (Next.js RSC compatibility)

Technology constraint: Next.js 14+ with App Router (no Pages Router).

## Decision

**next-intl** as the internationalization library, with Tailwind CSS `rtl:`
variant for RTL layout handling.

### Implementation Plan

1. **URL-based locale routing**:
   ```
   /en/deals       -> English LTR
   /ar/deals       -> Arabic RTL
   /en/deals/123   -> Deal detail (English)
   /ar/deals/123   -> Deal detail (Arabic)
   ```
   Implemented via Next.js middleware that detects locale from URL prefix,
   Accept-Language header, or cookie (in that priority order).

2. **Translation file structure** (`packages/i18n-messages/`):
   ```
   messages/
   ├── en.json      # English translations
   └── ar.json      # Arabic translations
   ```
   Shared between web and API. Flat key structure with namespacing:
   ```json
   {
     "deals.marketplace.title": "Deal Marketplace",
     "deals.marketplace.search": "Search deals...",
     "deals.detail.shariaStatus": "Sharia Compliance",
     "subscription.status.SUBMITTED": "Submitted"
   }
   ```

3. **RTL layout** via Tailwind CSS:
   ```html
   <html lang="ar" dir="rtl">
   ```
   Tailwind's `rtl:` variant handles directional styles:
   ```jsx
   <div className="ml-4 rtl:mr-4 rtl:ml-0">
   ```
   Global RTL adjustments in `globals.css`:
   ```css
   [dir="rtl"] { text-align: right; }
   ```

4. **Number formatting**:
   ```typescript
   // Western Arabic: 1,000.50
   new Intl.NumberFormat('en-QA', { style: 'currency', currency: 'QAR' })
   // Eastern Arabic: ١٬٠٠٠٫٥٠ ر.ق
   new Intl.NumberFormat('ar-QA', { style: 'currency', currency: 'QAR' })
   ```

5. **Date formatting** (Hijri + Gregorian):
   ```typescript
   // Gregorian: January 31, 2026
   new Intl.DateTimeFormat('en-QA', { dateStyle: 'long' })
   // Hijri: ١ رجب ١٤٤٧
   new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { dateStyle: 'long' })
   ```

6. **Backend i18n**:
   API error messages localized based on `Accept-Language` header.
   Notification templates stored with `{en, ar}` variants.

## Consequences

### Positive

- **RSC compatible**: next-intl is designed for Next.js App Router and RSC
- **ICU message format**: Industry standard for pluralization, gender,
  select, and number formatting
- **URL-based routing**: SEO-friendly, shareable, bookmarkable
- **Tailwind RTL**: No separate stylesheet; RTL is a variant like responsive
- **Intl API**: Native browser/Node.js formatting for numbers, dates, currency
  -- no heavy library needed for formatting
- **Shared translations**: Same JSON files used by frontend and backend
- **Type-safe**: next-intl supports TypeScript for translation keys

### Negative

- **Translation maintenance**: Every user-facing string needs Arabic and English
  variants. Mitigated by starting with English, translating in batches.
- **RTL testing burden**: Every UI component must be visually verified in both
  directions. Mitigated by Playwright visual regression tests.
- **Bundle size**: next-intl adds ~12KB gzipped. Acceptable for the
  functionality provided.
- **Content direction mixing**: Financial data (numbers, tickers) flows LTR
  even in Arabic context. Requires careful use of `dir="ltr"` on specific
  elements within RTL layout.

### Neutral

- Translation files grow linearly with features
- Locale switching is a full page navigation (URL change), not client-side
  only -- this is intentional for SEO and bookmarkability

## Alternatives Considered

### react-i18next (i18next ecosystem)

- **Pros**: Most popular React i18n library; huge ecosystem (150+ plugins);
  supports namespaces, backends, caching; used by major companies
- **Cons**: Not designed for RSC (requires client component wrappers for
  server-side rendering); heavier bundle (~25KB vs ~12KB); namespace
  configuration adds boilerplate; `useTranslation` hook requires client
  components in App Router
- **Why rejected**: RSC incompatibility is the primary reason. In Next.js 14
  App Router, react-i18next requires wrapping server components in client
  boundaries, losing RSC performance benefits. next-intl was built
  specifically for this architecture.

### Custom i18n solution (JSON files + React context)

- **Pros**: Zero dependency; full control; smallest bundle size
- **Cons**: Must implement pluralization, number formatting, date formatting,
  ICU message syntax manually; no TypeScript key safety; no middleware
  for locale detection; significant development time for features that
  next-intl provides out of the box
- **Why rejected**: Reinventing well-solved problems. ICU message format
  alone (pluralization rules vary by language -- Arabic has 6 plural forms)
  would require substantial effort to implement correctly.

### next-translate

- **Pros**: Lightweight; designed for Next.js; automatic page-level
  translation loading
- **Cons**: Primarily designed for Pages Router; limited App Router support;
  smaller community; no ICU message format (uses simple interpolation);
  less active maintenance
- **Why rejected**: Insufficient App Router support and lack of ICU message
  format. Arabic's complex pluralization (zero, one, two, few, many, other)
  requires ICU's `plural` syntax.

## References

- next-intl documentation: https://next-intl.dev/
- ICU Message Format: https://unicode-org.github.io/icu/userguide/format_parse/messages/
- Tailwind CSS RTL: https://tailwindcss.com/docs/hover-focus-and-other-states#rtl-support
- Arabic plural rules: https://www.unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html#ar
- Product Concept addendum (Cultural and Language Requirements)
