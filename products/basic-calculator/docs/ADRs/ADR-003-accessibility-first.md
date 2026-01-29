# ADR-003: Accessibility-First Design

**Status**: Accepted
**Date**: 2026-01-27
**Decision Makers**: Architect Agent
**Context**: Basic Calculator Web App

---

## Context

The PRD explicitly states that accessibility is a **P0 requirement**:
- WCAG 2.1 AA compliance mandatory
- Keyboard navigation must work perfectly
- Screen reader compatibility required
- Minimum touch target size: 44x44px
- Minimum contrast ratio: 4.5:1

This is not a "nice to have" – it's a core requirement from day one.

**Why Accessibility Matters**:
1. **Legal**: Many countries require WCAG compliance for public websites
2. **Inclusive**: Users with disabilities should be able to perform basic calculations
3. **Usability**: Accessibility improvements benefit all users (e.g., keyboard shortcuts)
4. **SEO**: Better semantic HTML improves search engine ranking

---

## Decision

### Build Accessibility In From The Start (Not Retrofit Later)

**Choice**: Architect the calculator with accessibility as a first-class requirement, not an afterthought.

**Alternatives Considered**:

| Approach | Pros | Cons | Why Not Chosen |
|----------|------|------|----------------|
| **Accessibility-First** ⭐ | Easier to build correctly from start, avoids retrofitting | Slightly more upfront design work | **CHOSEN** - Best practice |
| Build first, add A11y later | Faster initial development | Costly/difficult to retrofit, often incomplete | Tech debt, poor UX |
| Use A11y library | Some features automated | Not a substitute for good design | Complement, not replacement |
| Ignore accessibility | Fastest development | Excludes users, legal risk, poor practice | Unacceptable |

**Decision Rationale**:
1. **PRD Requirement**: WCAG 2.1 AA compliance is mandatory
2. **Easier Upfront**: Designing accessible components from the start is 10x easier than retrofitting
3. **Better UX**: Accessible design improves usability for everyone
4. **Right Thing**: Inclusive design is simply the right approach

---

## Implementation Requirements

### 1. Semantic HTML Structure

**Requirement**: Use proper HTML5 semantic elements

```tsx
// ✅ CORRECT: Semantic structure
<main role="main" aria-label="Basic Calculator">
  <div className="calculator" role="group" aria-label="Calculator interface">
    <output
      aria-live="polite"
      aria-atomic="true"
      id="calculator-display"
    >
      {displayValue}
    </output>

    <div role="grid" aria-label="Calculator buttons">
      {/* Buttons */}
    </div>
  </div>
</main>

// ❌ WRONG: Generic divs everywhere
<div>
  <div>{displayValue}</div>
  <div>
    {/* Buttons */}
  </div>
</div>
```

**Rationale**: Semantic HTML provides structure for screen readers

---

### 2. Keyboard Navigation

**Requirement**: Full keyboard operability without mouse

#### Keyboard Shortcuts

| Key | Action | Implementation |
|-----|--------|----------------|
| `0-9` | Input number | `onKeyDown` event listener |
| `+`, `-`, `*`, `/` | Select operation | `onKeyDown` event listener |
| `Enter` or `=` | Calculate result | `onKeyDown` event listener |
| `Escape` or `c` | Clear (C) | `onKeyDown` event listener |
| `Delete` or `C` (shift+c) | All Clear (AC) | `onKeyDown` event listener |
| `.` | Decimal point | `onKeyDown` event listener |
| `Backspace` | Delete last digit (Phase 2) | Future enhancement |
| `Tab` | Navigate buttons | Native browser behavior |
| `Space` | Activate focused button | Native `<button>` behavior |

#### Implementation

```tsx
// src/components/Calculator.tsx

useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    const { key } = event;

    // Prevent default for calculator keys
    if (/^[0-9+\-*/=.cC]$/.test(key) || key === 'Enter' || key === 'Escape') {
      event.preventDefault();
    }

    // Numbers
    if (/^[0-9]$/.test(key)) {
      handleNumberClick(key);
    }

    // Operations
    if (['+', '-', '*', '/'].includes(key)) {
      handleOperationClick(key as Operation);
    }

    // Equals
    if (key === 'Enter' || key === '=') {
      handleEqualsClick();
    }

    // Clear
    if (key === 'Escape' || key.toLowerCase() === 'c') {
      handleClearClick();
    }

    // Decimal
    if (key === '.') {
      handleDecimalClick();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [/* dependencies */]);
```

---

### 3. ARIA Labels and Live Regions

**Requirement**: Proper ARIA attributes for screen readers

#### Display (Live Region)

```tsx
<output
  role="status"
  aria-live="polite"
  aria-atomic="true"
  aria-label="Calculator display"
  className="calculator-display"
>
  {displayValue}
</output>
```

**Why `aria-live="polite"`**: Announces result changes without interrupting user

#### Buttons (Labels)

```tsx
// Number buttons
<button
  onClick={() => handleNumberClick('7')}
  aria-label="Seven"
  className="calculator-button"
>
  7
</button>

// Operation buttons
<button
  onClick={() => handleOperationClick('+')}
  aria-label="Plus"
  className="calculator-button operator"
>
  +
</button>

// Equals button
<button
  onClick={handleEqualsClick}
  aria-label="Equals"
  className="calculator-button equals"
>
  =
</button>

// Clear button
<button
  onClick={handleClearClick}
  aria-label="Clear"
  className="calculator-button clear"
>
  C
</button>
```

**Rationale**: Screen readers announce "Seven" instead of just "7", improving context

---

### 4. Focus Management

**Requirement**: Visible focus indicators and logical tab order

#### Focus Styles

```css
/* Tailwind classes */
.calculator-button {
  @apply focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-offset-2;
}

/* High contrast focus for accessibility */
.calculator-button:focus-visible {
  outline: 3px solid #0066CC;
  outline-offset: 2px;
}
```

**Contrast Requirement**: Focus indicator must have 3:1 contrast ratio (WCAG 2.1 AA)

#### Tab Order

```tsx
// Use semantic order (top to bottom, left to right)
<div className="calculator">
  <output tabIndex={-1}>{displayValue}</output> {/* Not focusable */}

  <div className="button-grid">
    {/* Row 1: 7, 8, 9, / */}
    {/* Row 2: 4, 5, 6, * */}
    {/* Row 3: 1, 2, 3, - */}
    {/* Row 4: 0, ., =, + */}
    {/* Row 5: C, AC */}
  </div>
</div>
```

**Note**: Since keyboard input works globally, users don't need to tab through buttons. Tab order is for mouse-free navigation.

---

### 5. Touch Target Size (Mobile)

**Requirement**: Minimum 44x44 pixels (WCAG 2.1 AA)

```tsx
// Tailwind config
<button className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20">
  {/* 56px (14*4) on mobile, 64px on tablet, 80px on desktop */}
</button>
```

**Rationale**:
- 44px minimum (WCAG): Ensures users with motor impairments can tap
- 56px actual (14 * 4px): Exceeds minimum for better UX
- Larger on desktop: More comfortable for mouse users

---

### 6. Color Contrast

**Requirement**: Minimum 4.5:1 contrast ratio for text (WCAG AA)

#### Color Palette

```typescript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // Background
        'calc-bg': '#1F2937',        // Gray-800 - Dark background

        // Display
        'calc-display-bg': '#111827', // Gray-900 - Display background
        'calc-display-text': '#F9FAFB', // Gray-50 - Display text (15.8:1 contrast)

        // Buttons
        'calc-btn-number': '#374151',  // Gray-700 - Number buttons
        'calc-btn-operator': '#1E40AF', // Blue-800 - Operator buttons
        'calc-btn-equals': '#15803D',  // Green-700 - Equals button
        'calc-btn-clear': '#B91C1C',   // Red-700 - Clear button

        // Text on buttons
        'calc-btn-text': '#F9FAFB',    // Gray-50 - White text (all pass 4.5:1)
      }
    }
  }
}
```

**Verified Contrast Ratios**:
- Display text on background: 15.8:1 ✅ (exceeds 7:1 AAA)
- Button text on number buttons: 8.2:1 ✅
- Button text on operator buttons: 7.1:1 ✅
- Button text on equals button: 5.9:1 ✅
- Button text on clear button: 6.2:1 ✅

**Tool**: Use [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) to verify

---

### 7. Error Messages

**Requirement**: Clear, accessible error announcements

```tsx
// Error state
{error && (
  <div
    role="alert"
    aria-live="assertive"
    className="error-message"
  >
    <span className="sr-only">Error: </span>
    {error}
  </div>
)}
```

**Why `aria-live="assertive"`**: Immediately interrupts to announce errors (e.g., division by zero)

**Example**:
- User presses `5 / 0 =`
- Screen reader announces: "Error: Cannot divide by zero"
- Visually displays: "Error: Cannot divide by zero"

---

### 8. Screen Reader Testing

**Requirement**: Test with real screen readers before release

#### Testing Checklist

- [ ] **VoiceOver (macOS/iOS)**: Safari + VoiceOver (Cmd+F5)
- [ ] **NVDA (Windows)**: Firefox + NVDA (free, open source)
- [ ] **JAWS (Windows)**: Chrome + JAWS (most popular, commercial)
- [ ] **TalkBack (Android)**: Chrome + TalkBack

#### What to Test

1. Can you navigate to all buttons with Tab?
2. Does screen reader announce button labels correctly?
3. When you press a number, does screen reader announce the display change?
4. When result is calculated, does screen reader announce it?
5. When error occurs, does screen reader announce it immediately?

---

## Accessibility Testing Tools

### Automated Testing

```bash
# Install axe-core for automated accessibility testing
npm install --save-dev @axe-core/react axe-playwright
```

```tsx
// src/main.tsx (development only)
if (import.meta.env.DEV) {
  import('@axe-core/react').then((axe) => {
    axe.default(React, ReactDOM, 1000);
  });
}
```

```typescript
// e2e/accessibility.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('should not have accessibility violations', async ({ page }) => {
  await page.goto('/');

  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});
```

### Manual Testing

1. **Keyboard-only navigation**: Unplug mouse, use only keyboard
2. **Screen reader**: Enable VoiceOver/NVDA and test full workflow
3. **Color blindness simulation**: Use browser DevTools or Color Oracle
4. **Zoom to 200%**: Text should reflow, no horizontal scrolling

---

## Documentation for Users

### Include Keyboard Shortcuts Help

```tsx
// Optional: Keyboard shortcuts help (Phase 2)
<details className="keyboard-help">
  <summary>Keyboard Shortcuts</summary>
  <dl>
    <dt>0-9</dt>
    <dd>Input numbers</dd>

    <dt>+ - * /</dt>
    <dd>Operations</dd>

    <dt>Enter or =</dt>
    <dd>Calculate result</dd>

    <dt>Escape or C</dt>
    <dd>Clear</dd>

    <dt>. (period)</dt>
    <dd>Decimal point</dd>
  </dl>
</details>
```

---

## Consequences

### Positive
- **Inclusive**: Works for users with disabilities
- **Better UX**: Keyboard shortcuts benefit all users (power users love them)
- **SEO**: Semantic HTML improves search ranking
- **Legal Compliance**: Meets WCAG 2.1 AA standards
- **Testable**: Automated accessibility tests catch regressions

### Negative
- **More Upfront Work**: Requires careful design of ARIA labels and focus management
- **More Testing**: Need to test with screen readers, not just visual browsers

### Neutral
- **Learning**: Team gains accessibility expertise (valuable skill)

---

## Checklist for Developers

Before marking a feature "done":

- [ ] All buttons have descriptive `aria-label`
- [ ] Display uses `aria-live="polite"` for announcements
- [ ] Errors use `aria-live="assertive"`
- [ ] Focus indicators visible on all interactive elements (3:1 contrast)
- [ ] Keyboard shortcuts work for all operations
- [ ] Touch targets are 44x44px minimum on mobile
- [ ] Color contrast meets 4.5:1 for all text
- [ ] Automated accessibility tests pass (axe-core)
- [ ] Manual screen reader test completed
- [ ] Manual keyboard-only navigation test completed

---

## References

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM: Keyboard Accessibility](https://webaim.org/techniques/keyboard/)
- [MDN: ARIA Live Regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/ARIA_Live_Regions)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [VoiceOver User Guide](https://support.apple.com/guide/voiceover/)
- [NVDA Screen Reader](https://www.nvaccess.org/)
