# Widget Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Merchant Website                            │
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  HTML                                                   │     │
│  │  ───────────────────────────────────────────────────    │     │
│  │  <script src="https://gateway.io/widget.js"></script>  │     │
│  │  <div id="payment-button"></div>                        │     │
│  │                                                          │     │
│  │  <script>                                               │     │
│  │    StablecoinGateway.render('payment-button', {        │     │
│  │      paymentLinkId: 'abc123',                          │     │
│  │      onComplete: (data) => { ... }                     │     │
│  │    });                                                  │     │
│  │  </script>                                              │     │
│  └────────────────────────────────────────────────────────┘     │
│                             │                                     │
│                             ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │         Widget (window.StablecoinGateway)               │    │
│  │  ───────────────────────────────────────────────────     │    │
│  │                                                          │    │
│  │  ┌──────────────┐      ┌──────────────┐                │    │
│  │  │   Button     │      │    Modal     │                │    │
│  │  │   Renderer   │─────▶│   Manager    │                │    │
│  │  └──────────────┘      └──────┬───────┘                │    │
│  │                               │                          │    │
│  │                               ▼                          │    │
│  │                        ┌──────────────┐                 │    │
│  │                        │   Iframe     │                 │    │
│  │                        │   Loader     │                 │    │
│  │                        └──────┬───────┘                 │    │
│  │                               │                          │    │
│  │  ┌──────────────────────────┬─┴────────────────┐        │    │
│  │  │  postMessage Handler     │                  │        │    │
│  │  │  ─────────────────────   │                  │        │    │
│  │  │  • payment.completed ────┼─▶ onComplete()   │        │    │
│  │  │  • payment.failed    ────┼─▶ onFailed()     │        │    │
│  │  │  • payment.cancelled ────┼─▶ onCancel()     │        │    │
│  │  └──────────────────────────┴──────────────────┘        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                             │                                     │
└─────────────────────────────┼─────────────────────────────────────┘
                              │
                              ▼ (iframe src)
┌─────────────────────────────────────────────────────────────────┐
│                   Gateway Checkout Page                          │
│                   (https://gateway.io/pay/abc123)                │
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  • Display payment details                              │     │
│  │  • Connect wallet (MetaMask, etc.)                      │     │
│  │  • Execute blockchain transaction                       │     │
│  │  • Monitor transaction status                           │     │
│  │  • Send postMessage to parent window:                   │     │
│  │                                                          │     │
│  │    window.parent.postMessage({                          │     │
│  │      type: 'payment.completed',                         │     │
│  │      data: { paymentId, txHash }                        │     │
│  │    }, 'https://merchant.com');                          │     │
│  └────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

## Component Breakdown

### 1. StablecoinWidget Class

**Responsibilities**:
- Manage widget state (modal, iframe)
- Handle user interactions
- Process postMessage events
- Execute callbacks

**Key Methods**:
```typescript
constructor(config: WidgetConfig)         // Initialize widget
setupMessageListener()                    // Listen for postMessage
createButton(): HTMLButtonElement         // Render styled button
createModal(): HTMLElement                // Create modal + iframe
render(containerId: string)               // Render to container
openModal()                               // Show modal
closeModal()                              // Hide modal
handleComplete(data)                      // Process success
handleFailed(error)                       // Process failure
handleCancel()                            // Process cancellation
```

### 2. Global API

**Exposed Interface**:
```typescript
window.StablecoinGateway = {
  render(containerId, config),   // Render button in container
  openModal(config)               // Open modal programmatically
}
```

**Usage Pattern**:
```javascript
// Pattern 1: Render button
StablecoinGateway.render('container-id', { ... });

// Pattern 2: Programmatic modal
StablecoinGateway.openModal({ ... });
```

### 3. Configuration System

**Type-Safe Config**:
```typescript
interface WidgetConfig {
  // Required (one of)
  paymentLinkId?: string;
  amount?: number;
  merchantAddress?: string;

  // Optional
  apiUrl: string;              // default: 'https://pay.gateway.io'
  currency: string;            // default: 'USD'
  network: string;             // default: 'polygon'
  token: string;               // default: 'USDC'
  theme: 'light' | 'dark';     // default: 'light'
  primaryColor: string;        // default: '#4F46E5'
  buttonText: string;          // default: 'Pay with Crypto'

  // Callbacks
  onComplete?: (data) => void;
  onFailed?: (error) => void;
  onCancel?: () => void;
}
```

### 4. Event Flow

```
User clicks button
      │
      ▼
Widget creates modal
      │
      ▼
Widget creates iframe
      │
      ▼
Iframe loads checkout page
      │
      ▼
User completes payment
      │
      ▼
Checkout page sends postMessage
      │
      ▼
Widget receives message
      │
      ├─▶ Verify origin
      ├─▶ Parse event type
      └─▶ Execute callback
             │
             ├─▶ onComplete(data)
             ├─▶ onFailed(error)
             └─▶ onCancel()
                    │
                    ▼
             Close modal
```

## Security Architecture

### Origin Verification

```typescript
const apiOrigin = new URL(this.config.apiUrl).origin;
if (event.origin !== apiOrigin) return; // Reject
```

**Why?**: Prevents malicious sites from sending fake payment events.

### Iframe Isolation

```
┌─────────────────────────────────┐
│   Merchant Site (merchant.com)  │
│                                  │
│  ┌───────────────────────────┐  │
│  │  Widget Code              │  │
│  │  • No access to iframe    │  │
│  │  • No wallet access       │  │
│  │  • No transaction data    │  │
│  └───────────────────────────┘  │
│          │                       │
│          │ postMessage only      │
│          ▼                       │
│  ┌───────────────────────────┐  │
│  │  Iframe (gateway.io)      │  │
│  │  • Isolated context       │  │
│  │  • Can't access parent    │  │
│  │  • Has wallet access      │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### No Data Storage

```typescript
// ✗ Widget does NOT do this:
localStorage.setItem('payment', data);
sessionStorage.setItem('payment', data);
document.cookie = 'payment=' + data;

// ✓ Widget only uses:
// - In-memory state (this.modal, this.iframe)
// - Callback functions (onComplete, etc.)
```

## State Management

```
Widget State Machine:

    [Initialized]
         │
         ▼
    [Button Rendered]
         │
         ▼ (user clicks)
    [Modal Opening]
         │
         ▼
    [Iframe Loading]
         │
         ▼
    [Awaiting Payment]
         │
         ├─▶ [Payment Success] ─▶ onComplete() ─▶ [Modal Closing]
         ├─▶ [Payment Failed]  ─▶ onFailed()   ─▶ [Modal Closing]
         └─▶ [User Cancelled]  ─▶ onCancel()   ─▶ [Modal Closing]
                                                         │
                                                         ▼
                                                    [Closed]
                                                         │
                                                         ▼
                                              (ready for next payment)
```

## CSS Architecture

### Inline Styles (No External CSS)

```typescript
// Button styles
button.style.cssText = `
  background-color: ${this.config.primaryColor};
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  ...
`;

// Modal styles
modal.style.cssText = `
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  ...
`;
```

**Why inline?**:
- No external stylesheet to load (faster)
- No CSS conflicts with merchant site
- Self-contained bundle
- Smaller total size

### CSS Transitions

```
Modal Open Animation:
  opacity: 0 → 1 (300ms)
  transform: scale(0.95) → scale(1) (300ms)

Modal Close Animation:
  opacity: 1 → 0 (300ms)
  transform: scale(1) → scale(0.95) (300ms)
```

## Build Architecture

```
src/widget.ts
     │
     ▼ (TypeScript compiler)
JavaScript (ES2020)
     │
     ▼ (esbuild bundler)
dist/widget.js (4.3KB minified)
     │
     ▼ (CDN)
https://gateway.io/widget.js
     │
     ▼ (merchant includes)
<script src="https://gateway.io/widget.js"></script>
```

### Build Pipeline

```bash
# Development build
esbuild src/widget.ts \
  --bundle \
  --sourcemap \
  --outfile=dist/widget.js \
  --global-name=StablecoinGateway

# Production build
esbuild src/widget.ts \
  --bundle \
  --minify \
  --outfile=dist/widget.js \
  --global-name=StablecoinGateway
```

## Performance Architecture

### Bundle Size Optimization

```
Source: 284 lines TypeScript
  ↓ (compile)
JavaScript: ~8KB
  ↓ (bundle)
Bundled: ~8KB
  ↓ (minify)
Minified: 4.3KB
  ↓ (gzip)
Gzipped: ~1.8KB ← Actual transfer size
```

### Load Performance

```
Network Request (1.8KB gzipped)
     │ 10-50ms on 4G
     ▼
Parse JavaScript
     │ 5-10ms
     ▼
Execute Widget Code
     │ <5ms
     ▼
Widget Ready
     │ Total: 20-65ms
     ▼
User clicks button
     │ 0ms (instant)
     ▼
Modal opens
     │ 300ms (animation)
     ▼
Iframe loads checkout
     │ 500-2000ms (network + checkout app)
     ▼
Ready for payment
```

## Extension Points

### Future Enhancements

```typescript
// 1. Custom CSS injection
interface WidgetConfig {
  customCSS?: string;
  cssClass?: string;
}

// 2. Analytics events
interface WidgetConfig {
  onAnalytics?: (event: string, data: any) => void;
}

// 3. Loading states
interface WidgetConfig {
  showLoadingSpinner?: boolean;
  loadingText?: string;
}

// 4. QR code display
interface WidgetConfig {
  showQRCode?: boolean;
  qrCodeSize?: number;
}
```

## Testing Architecture

```
test.html
   │
   ├─▶ Test 1: Payment Link
   ├─▶ Test 2: Dynamic Amount
   ├─▶ Test 3: Custom Styling
   ├─▶ Test 4: Dark Theme
   ├─▶ Test 5: Ethereum Network
   └─▶ Test 6: Minimal Config

Manual Tests:
   │
   ├─▶ Modal open/close
   ├─▶ Multiple instances
   ├─▶ Event simulation
   │     ├─▶ Simulate success
   │     ├─▶ Simulate failure
   │     └─▶ Simulate cancel
   └─▶ Cross-browser testing
```

## Deployment Architecture

```
Development:
  src/widget.ts → build → dist/widget.js → file:// or localhost

Staging:
  src/widget.ts → build → dist/widget.js → https://staging.gateway.io/widget.js

Production:
  src/widget.ts → build → dist/widget.js → CDN:
    ├─▶ https://cdn.gateway.io/widget.js (latest)
    ├─▶ https://cdn.gateway.io/widget-v1.0.0.js (versioned)
    └─▶ https://cdn.gateway.io/widget-v1.js (major version)
```

## Error Handling

```typescript
// Error scenarios handled:

1. Container not found
   ├─▶ Log error to console
   └─▶ Fail gracefully

2. Invalid postMessage origin
   ├─▶ Reject message silently
   └─▶ No callback execution

3. Missing configuration
   ├─▶ Use defaults where possible
   └─▶ Log warning if critical

4. Network errors (iframe load fail)
   ├─▶ Browser handles natively
   └─▶ User sees error in iframe

5. Callback errors
   ├─▶ Try/catch not implemented (merchant responsibility)
   └─▶ Errors bubble to merchant code
```

---

**Architecture Version**: 1.0.0
**Last Updated**: 2026-02-02
**Design Principles**:
- Simplicity over features
- Security by default
- Zero dependencies
- Performance first
- Developer ergonomics
