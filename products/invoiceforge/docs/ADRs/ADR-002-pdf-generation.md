# ADR-002: Server-Side PDF Generation with @react-pdf/renderer

## Status

Accepted

## Context

InvoiceForge must generate professional PDF invoices that users can download
and share with clients. The PDF must include: invoice number, dates,
from/to addresses, a line items table, subtotal, tax, total, notes, and
an optional payment link.

Requirements:

1. **Server-side generation**: PDFs must be generated on the backend, not
   in the browser. This ensures consistent output regardless of client
   device and enables PDF generation for public invoice views.
2. **Professional layout**: Clean, single-column invoice template with
   proper typography, alignment, and table formatting.
3. **Performance**: PDF generation must complete in <3 seconds (NFR-003).
4. **Maintainability**: The PDF template should be easy to modify by
   developers familiar with React.
5. **No external dependencies**: No headless browser process to manage
   in production.

## Decision

Use **@react-pdf/renderer** for server-side PDF generation.

### How It Works

`@react-pdf/renderer` provides React components (`Document`, `Page`, `View`,
`Text`, `StyleSheet`) that compile directly to PDF without a browser. The
invoice template is written as a React component and rendered to a PDF
buffer on the server.

```typescript
// Simplified example
import { Document, Page, Text, View } from '@react-pdf/renderer';

const InvoicePDF = ({ invoice }) => (
  <Document>
    <Page size="A4">
      <View>
        <Text>{invoice.invoiceNumber}</Text>
        {/* ... line items table, totals, etc. */}
      </View>
    </Page>
  </Document>
);

// Generate PDF buffer
const pdfBuffer = await renderToBuffer(<InvoicePDF invoice={invoice} />);
```

### Integration

- PDF template lives in `apps/api/src/modules/invoices/invoices.pdf.tsx`
- Rendered on-demand when user requests PDF download (GET /api/invoices/:id/pdf)
- Returns binary stream with `Content-Type: application/pdf`
- File named `INV-{number}-{client-name-slug}.pdf`

## Consequences

### Positive

- **No headless browser**: No Puppeteer/Chromium process to install, manage,
  or keep updated in production. Dramatically simpler deployment.
- **Fast generation**: Renders PDF in 200-500ms (well under 3-second target)
  because it compiles directly to PDF primitives without rendering HTML first.
- **React-based**: Template is written in familiar React/JSX. Frontend and
  backend engineers can both modify it. Component reuse is possible.
- **Lightweight**: ~2MB dependency vs. ~300MB for Puppeteer + Chromium.
  Smaller Docker images, faster deploys.
- **Deterministic**: Same input always produces same output. No browser
  rendering quirks or font rendering differences.

### Negative

- **Limited CSS support**: @react-pdf uses its own styling system (Yoga
  layout engine). Not all CSS properties are available. Complex layouts
  may require workarounds.
- **No HTML rendering**: Cannot render arbitrary HTML in the PDF. Invoice
  content must be structured data, not HTML (which is fine for our use case).
- **Font management**: Custom fonts must be explicitly registered. Default
  fonts are limited. Need to bundle a professional font (e.g., Inter).
- **Ecosystem smaller than Puppeteer**: Fewer Stack Overflow answers and
  community examples, though documentation is solid.

### Neutral

- Template changes require a code deploy (not a database/CMS change).
  Acceptable for MVP; custom templates are Phase 2.
- Generated PDFs are slightly larger than Puppeteer output (~50-100KB
  for a typical invoice vs ~30-50KB), but this is negligible.

## Alternatives Considered

### Puppeteer (Headless Chrome)

- **Pros**: Pixel-perfect HTML-to-PDF rendering, full CSS support, can
  render any web page as PDF, widely used
- **Cons**: Requires Chromium binary (~300MB), slow startup (2-5 seconds
  cold start), memory-hungry (150MB+ per instance), complex to deploy
  (needs system dependencies), security surface area of a full browser
- **Why rejected**: The operational complexity is disproportionate for
  generating structured invoices. We do not need arbitrary HTML rendering.
  The deployment burden (Chromium in Docker, memory management, cold
  starts) adds fragility to a core feature.

### pdf-lib

- **Pros**: Very lightweight (~500KB), low-level PDF manipulation, fast,
  no dependencies
- **Cons**: Imperative API (manual coordinate positioning), no layout
  engine, no table support, building an invoice template requires
  hundreds of lines of coordinate-based code, painful to maintain
- **Why rejected**: Developer experience is poor. Building and
  maintaining a professional invoice layout with manual x/y coordinates
  is error-prone and time-consuming. @react-pdf's declarative approach
  is vastly more maintainable.

### jsPDF

- **Pros**: Popular, works in browser and Node.js, simple API
- **Cons**: Limited layout capabilities, table plugin is fragile, font
  support is weak, primarily designed for client-side use
- **Why rejected**: Quality of output is lower than @react-pdf. Table
  rendering is unreliable for complex invoices. Not a natural fit for
  server-side generation.

### PDFKit

- **Pros**: Mature Node.js library, good font support, streaming output
- **Cons**: Imperative API (like pdf-lib), manual positioning, no
  declarative template system
- **Why rejected**: Same maintainability concerns as pdf-lib. Lacks
  the component-based approach that makes template updates manageable.

## References

- @react-pdf/renderer: https://react-pdf.org/
- Yoga layout engine: https://yogalayout.dev/
- InvoiceForge PRD: FR-021 through FR-024, NFR-003
