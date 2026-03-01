# Internationalization (i18n) Check Command

Verify Arabic/English bilingual completeness, RTL layout support, and locale-aware formatting across a ConnectSW product.

## Usage

```
/i18n-check <product-name>
```

Examples:
```
/i18n-check stablecoin-gateway
/i18n-check connectin
/i18n-check connectgrc
```

## Arguments

- **product-name**: Product directory name under `products/` (e.g., `stablecoin-gateway`, `connectin`). All ConnectSW products targeting the Qatar/MENA market require bilingual support.

## What This Command Does

This command audits a product for Arabic/English bilingual completeness. ConnectSW products serve the Qatar and MENA market, where bilingual (Arabic + English) support is a regulatory and user expectation, not a nice-to-have. This check verifies:

1. **Translation completeness** -- all user-facing strings have both `ar` and `en` translations
2. **RTL layout support** -- right-to-left CSS and HTML attributes are correctly implemented
3. **Arabic typography** -- appropriate font stacks for Arabic script rendering
4. **Date/number formatting** -- Arabic locale formatting (Eastern Arabic numerals, Hijri dates)
5. **Bidirectional text handling** -- mixed LTR/RTL content renders correctly

**Reference protocols**:
- `.specify/memory/constitution.md` (Article VI: Quality, Article IX: Documentation)
- `.claude/protocols/verification-before-completion.md` (5-step verification gate)

## Execution Steps

### Step 1: Validate Product Exists

```bash
PRODUCT_DIR="products/$ARGUMENTS"

if [ ! -d "$PRODUCT_DIR" ]; then
  echo "FAIL: Product directory '$PRODUCT_DIR' does not exist."
  echo "Available products:"
  ls products/
  exit 1
fi

echo "i18n check target: $ARGUMENTS"
echo "Product path: $PRODUCT_DIR"
```

### Step 2: Load Product Context

Read the product context to understand its UI surface area:
- File: `products/$ARGUMENTS/README.md`
- File: `products/$ARGUMENTS/.claude/addendum.md` (if exists)
- File: `products/$ARGUMENTS/docs/PRD.md` (if exists)

Determine the frontend technology:
- Check for Next.js (`next.config.*`), React, or other frontend frameworks
- Identify the i18n library in use (next-intl, react-i18next, i18next, custom)

### Step 3: Translation File Completeness

Verify that all translation keys exist in both Arabic and English locale files.

**3a. Locate translation files**:

```bash
echo "=== CHECK: Translation Files ==="

# Find translation/locale files
echo "--- Locating translation files ---"
find "$PRODUCT_DIR" -type f \( \
  -name "*.json" -path "*/locales/*" -o \
  -name "*.json" -path "*/translations/*" -o \
  -name "*.json" -path "*/i18n/*" -o \
  -name "*.json" -path "*/messages/*" -o \
  -name "ar.json" -o -name "en.json" -o \
  -name "ar.ts" -o -name "en.ts" \
\) 2>/dev/null | sort

# Check for i18n config
echo "--- i18n configuration ---"
find "$PRODUCT_DIR" -type f \( \
  -name "i18n.*" -o -name "next-intl.*" -o -name "i18next.*" \
\) 2>/dev/null | sort
```

**3b. Compare Arabic and English keys**:

```bash
echo "--- Key comparison ---"

# Find ar and en JSON files in locales directories
AR_FILES=$(find "$PRODUCT_DIR" -type f -name "ar.json" -path "*/locales/*" -o -name "ar.json" -path "*/messages/*" -o -name "ar.json" -path "*/translations/*" 2>/dev/null)
EN_FILES=$(find "$PRODUCT_DIR" -type f -name "en.json" -path "*/locales/*" -o -name "en.json" -path "*/messages/*" -o -name "en.json" -path "*/translations/*" 2>/dev/null)

if [ -z "$AR_FILES" ] && [ -z "$EN_FILES" ]; then
  echo "  FAIL: No Arabic or English translation files found"
elif [ -z "$AR_FILES" ]; then
  echo "  FAIL: English translations found but Arabic translations are MISSING"
elif [ -z "$EN_FILES" ]; then
  echo "  FAIL: Arabic translations found but English translations are MISSING"
else
  echo "  Arabic files found: $(echo "$AR_FILES" | wc -l | tr -d ' ')"
  echo "  English files found: $(echo "$EN_FILES" | wc -l | tr -d ' ')"
fi
```

For each pair of ar/en translation files in the same directory, use `jq` (if available) to:
1. Extract all keys from the English file
2. Extract all keys from the Arabic file
3. Report keys present in English but missing in Arabic (untranslated)
4. Report keys present in Arabic but missing in English (orphaned)

**3c. Hardcoded string detection**:

```bash
echo "--- Hardcoded user-facing strings ---"

# Search for hardcoded English strings in JSX/TSX (common i18n violation)
grep -rn --include="*.tsx" --include="*.jsx" \
  -E '>[A-Z][a-z]{2,}(\s+[a-z]+){1,}</' \
  "$PRODUCT_DIR/apps/web/src/" 2>/dev/null | head -20 || echo "  No obvious hardcoded strings in JSX"

# Search for hardcoded strings in button/label/placeholder/title/alt attributes
grep -rn --include="*.tsx" --include="*.jsx" \
  -E '(placeholder|title|alt|aria-label)="[A-Z][a-zA-Z\s]{3,}"' \
  "$PRODUCT_DIR/apps/web/src/" 2>/dev/null | head -20 || echo "  No hardcoded attribute strings found"
```

### Step 4: RTL Layout Support

Verify right-to-left CSS and HTML directionality support.

**4a. HTML dir attribute**:

```bash
echo ""
echo "=== CHECK: RTL Layout Support ==="

# Check for dir="rtl" or dir attribute handling in layout/root components
echo "--- HTML dir attribute ---"
grep -rn --include="*.tsx" --include="*.jsx" --include="*.html" \
  -E '(dir=|direction|dir\s*:)' \
  "$PRODUCT_DIR/apps/web/" 2>/dev/null || echo "  WARN: No dir attribute handling found in HTML/JSX"
```

**4b. RTL-aware CSS**:

```bash
# Check for logical CSS properties (RTL-safe)
echo "--- Logical CSS properties (RTL-safe) ---"
grep -rn --include="*.css" --include="*.scss" --include="*.tsx" --include="*.ts" \
  -E '(margin-inline|padding-inline|inset-inline|border-inline|text-align:\s*(start|end)|float:\s*(inline-start|inline-end))' \
  "$PRODUCT_DIR/apps/web/" 2>/dev/null | wc -l | xargs -I{} echo "  Logical properties found: {} occurrences"

# Check for physical CSS properties that break in RTL
echo "--- Physical CSS properties (RTL-unsafe) ---"
grep -rn --include="*.css" --include="*.scss" \
  -E '(margin-left|margin-right|padding-left|padding-right|text-align:\s*(left|right)|float:\s*(left|right))' \
  "$PRODUCT_DIR/apps/web/" 2>/dev/null | wc -l | xargs -I{} echo "  Physical (RTL-unsafe) properties found: {} occurrences"
```

**4c. Tailwind RTL support**:

```bash
# Check for Tailwind RTL utilities (rtl: and ltr: variants)
echo "--- Tailwind RTL utilities ---"
grep -rn --include="*.tsx" --include="*.jsx" \
  -E '(rtl:|ltr:|dir-\[rtl\]|dir-\[ltr\])' \
  "$PRODUCT_DIR/apps/web/" 2>/dev/null | wc -l | xargs -I{} echo "  Tailwind RTL utilities found: {} occurrences"

# Check tailwind config for RTL plugin
echo "--- Tailwind RTL plugin ---"
grep -n -iE "(tailwindcss-rtl|rtl|direction)" \
  "$PRODUCT_DIR/apps/web/tailwind.config."* 2>/dev/null || echo "  INFO: No RTL plugin in Tailwind config"
```

### Step 5: Arabic Typography

Verify appropriate font stacks for Arabic script.

```bash
echo ""
echo "=== CHECK: Arabic Typography ==="

# Check for Arabic font families
echo "--- Arabic font references ---"
grep -rn --include="*.css" --include="*.scss" --include="*.tsx" --include="*.ts" --include="*.json" \
  -iE "(Noto Sans Arabic|Noto Kufi Arabic|Cairo|Tajawal|IBM Plex Arabic|Amiri|Scheherazade|Almarai|El Messiri|Changa|Readex Pro|Noto Naskh)" \
  "$PRODUCT_DIR/apps/web/" 2>/dev/null || echo "  WARN: No Arabic font families found"

# Check for Google Fonts Arabic imports
echo "--- Google Fonts Arabic imports ---"
grep -rn --include="*.css" --include="*.scss" --include="*.tsx" --include="*.ts" --include="*.html" \
  -E "(fonts\.google.*arabic|fonts\.googleapis.*arabic)" \
  "$PRODUCT_DIR/apps/web/" 2>/dev/null || echo "  INFO: No Google Fonts Arabic imports found"

# Check for next/font Arabic configuration (Next.js products)
echo "--- Next.js font configuration ---"
grep -rn --include="*.ts" --include="*.tsx" \
  -iE "(next/font.*arabic|arabic.*next/font|subsets.*\[.*arabic)" \
  "$PRODUCT_DIR/apps/web/" 2>/dev/null || echo "  INFO: No Next.js Arabic font configuration found"

# Check for font-feature-settings for Arabic ligatures
echo "--- Arabic ligature support ---"
grep -rn --include="*.css" --include="*.scss" --include="*.tsx" \
  -E "(font-feature-settings|liga|calt)" \
  "$PRODUCT_DIR/apps/web/" 2>/dev/null | head -5 || echo "  INFO: No explicit ligature settings found"
```

### Step 6: Date and Number Formatting

Verify Arabic locale support for dates, numbers, and currency.

```bash
echo ""
echo "=== CHECK: Date/Number Formatting ==="

# Check for Intl API usage with Arabic locale
echo "--- Intl API Arabic locale ---"
grep -rn --include="*.ts" --include="*.tsx" \
  -E "(Intl\.(NumberFormat|DateTimeFormat|RelativeTimeFormat).*['\"]ar)" \
  "$PRODUCT_DIR/apps/" 2>/dev/null || echo "  WARN: No Intl API usage with Arabic locale found"

# Check for Eastern Arabic numeral support
echo "--- Eastern Arabic numerals ---"
grep -rn --include="*.ts" --include="*.tsx" \
  -iE "(eastern[_-]?arabic|arab[_-]?indic|numberingSystem.*arab|\u0660|\u0661|\u0662)" \
  "$PRODUCT_DIR/apps/" 2>/dev/null || echo "  INFO: No explicit Eastern Arabic numeral handling found"

# Check for locale-aware date formatting
echo "--- Locale-aware date formatting ---"
grep -rn --include="*.ts" --include="*.tsx" \
  -E "(locale.*['\"]ar|['\"]ar['\"].*locale|formatDate.*ar|dateFormat.*ar)" \
  "$PRODUCT_DIR/apps/" 2>/dev/null || echo "  WARN: No locale-aware date formatting for Arabic found"

# Check for currency formatting (QAR - Qatari Riyal)
echo "--- Qatari Riyal (QAR) currency formatting ---"
grep -rn --include="*.ts" --include="*.tsx" \
  -E "(QAR|Qatari Riyal|currency.*QAR|\u0631\.\u0642)" \
  "$PRODUCT_DIR/apps/" 2>/dev/null || echo "  INFO: No QAR currency formatting found"
```

### Step 7: Bidirectional Text Handling

Verify correct handling of mixed LTR/RTL content.

```bash
echo ""
echo "=== CHECK: Bidirectional Text Handling ==="

# Check for Unicode bidi control characters or CSS bidi handling
echo "--- Bidi isolation ---"
grep -rn --include="*.tsx" --include="*.jsx" --include="*.css" \
  -E "(unicode-bidi|bdi>|<bdi|isolate|BidiOverride|dir=\"auto\"|dir='auto')" \
  "$PRODUCT_DIR/apps/web/" 2>/dev/null || echo "  WARN: No bidi isolation handling found"

# Check for useDirection or useLocale hooks
echo "--- Direction hooks/context ---"
grep -rn --include="*.ts" --include="*.tsx" \
  -iE "(useDirection|useLocale|useRtl|DirectionProvider|DirectionContext|isRtl)" \
  "$PRODUCT_DIR/apps/web/" 2>/dev/null || echo "  WARN: No direction context/hooks found"

# Check for locale switching mechanism
echo "--- Locale switcher ---"
grep -rn --include="*.tsx" --include="*.jsx" \
  -iE "(LocaleSwitcher|LanguageSwitcher|LanguageToggle|switchLocale|changeLanguage|setLocale)" \
  "$PRODUCT_DIR/apps/web/" 2>/dev/null || echo "  WARN: No locale switcher component found"

# Check for locale in URL/routing
echo "--- Locale routing ---"
grep -rn --include="*.ts" --include="*.tsx" --include="*.js" \
  -iE "(locale.*route|i18n.*routing|\[locale\]|localePrefix|defaultLocale)" \
  "$PRODUCT_DIR/apps/web/" 2>/dev/null || echo "  INFO: No locale-based routing found"
```

### Step 8: Generate i18n Report

After running all checks, compile results into a structured report.

**Report format**:

```markdown
## i18n Check Report: [product-name]

**Date**: [YYYY-MM-DD]
**Product**: [product-name]
**Checker**: Frontend Engineer Agent (i18n Module)
**Target Locales**: Arabic (ar), English (en)

### Summary

[2-3 sentence overall i18n readiness assessment]

### Results

| # | Category | Check Item | Status | Details |
|---|----------|-----------|--------|---------|
| 1 | Translation | Arabic translation files exist | PASS/WARN/FAIL | [file paths or "Missing"] |
| 2 | Translation | English translation files exist | PASS/WARN/FAIL | [file paths or "Missing"] |
| 3 | Translation | All English keys have Arabic translations | PASS/WARN/FAIL | [X missing keys or "Complete"] |
| 4 | Translation | No orphaned Arabic keys | PASS/WARN/FAIL | [X orphaned or "Clean"] |
| 5 | Translation | No hardcoded user-facing strings | PASS/WARN/FAIL | [X violations or "Clean"] |
| 6 | RTL | HTML dir attribute handled | PASS/WARN/FAIL | [location or "Missing"] |
| 7 | RTL | Logical CSS properties used | PASS/WARN/FAIL | [count or "Not using logical properties"] |
| 8 | RTL | No RTL-breaking physical properties | PASS/WARN/FAIL | [X violations or "Clean"] |
| 9 | RTL | Tailwind RTL utilities | PASS/WARN/FAIL | [count or "None"] |
| 10 | Typography | Arabic font stack defined | PASS/WARN/FAIL | [font names or "Missing"] |
| 11 | Typography | Arabic ligature support | PASS/WARN/FAIL | [settings or "Not configured"] |
| 12 | Formatting | Arabic locale date formatting | PASS/WARN/FAIL | [method or "Missing"] |
| 13 | Formatting | Arabic locale number formatting | PASS/WARN/FAIL | [method or "Missing"] |
| 14 | Formatting | QAR currency formatting | PASS/WARN/FAIL | [method or "N/A"] |
| 15 | Bidi | Bidi isolation for mixed content | PASS/WARN/FAIL | [method or "Missing"] |
| 16 | Bidi | Direction context/hooks | PASS/WARN/FAIL | [hook name or "Missing"] |
| 17 | Bidi | Locale switcher component | PASS/WARN/FAIL | [component or "Missing"] |
| 18 | Bidi | Locale-based routing | PASS/WARN/FAIL | [pattern or "N/A"] |

### Scoring

- **PASS**: [count] / 18
- **WARN**: [count] / 18
- **FAIL**: [count] / 18

### i18n Verdict

| Category | Verdict |
|----------|---------|
| Translation Completeness | PASS / WARN / FAIL |
| RTL Layout Support | PASS / WARN / FAIL |
| Arabic Typography | PASS / WARN / FAIL |
| Date/Number Formatting | PASS / WARN / FAIL |
| Bidirectional Text | PASS / WARN / FAIL |
| **Overall** | **PASS / WARN / FAIL** |

Verdict logic:
- **PASS**: All categories pass. Product is bilingual-ready.
- **WARN**: Some categories have warnings. Product may launch with documented gaps and a remediation timeline.
- **FAIL**: One or more categories failed. Translation files missing, no RTL support, or no Arabic fonts constitute hard failures for MENA-market products.

### Remediation Actions

| Priority | Action | Owner | Category |
|----------|--------|-------|----------|
| [P0/P1/P2] | [specific action] | [agent role] | [Translation/RTL/Typography/Formatting/Bidi] |

### Best Practices Reference

- **Translation**: Use a structured i18n library (next-intl, react-i18next). Never hardcode user-facing strings.
- **RTL**: Use CSS logical properties (`margin-inline-start` not `margin-left`). Use Tailwind `rtl:` variants.
- **Typography**: Include at minimum one Arabic web font (Cairo, Tajawal, or IBM Plex Arabic). Set `font-feature-settings` for proper Arabic ligatures.
- **Formatting**: Use `Intl.NumberFormat('ar-QA')` and `Intl.DateTimeFormat('ar-QA')` for locale-aware formatting. Support both Western and Eastern Arabic numerals.
- **Bidi**: Wrap user-generated content in `<bdi>` elements. Use `dir="auto"` for dynamic content. Provide a `DirectionProvider` context at the app root.
```

### Step 9: Save Report

Save the i18n report to:
```
products/$ARGUMENTS/docs/quality-reports/i18n-check-[YYYY-MM-DD].md
```

Create the directory if it does not exist:
```bash
mkdir -p "products/$ARGUMENTS/docs/quality-reports"
```

### Step 10: Log to Audit Trail

```bash
.claude/scripts/post-task-update.sh frontend-engineer I18N-CHECK-$ARGUMENTS $ARGUMENTS success 0 "i18n check completed: [verdict]"
```

## Status Definitions

| Status | Meaning |
|--------|---------|
| **PASS** | Check item fully satisfied. Both Arabic and English support verified in code. |
| **WARN** | Check item partially implemented or could not be fully verified from source alone. Manual browser testing recommended. |
| **FAIL** | Check item missing or broken. Required i18n capability is absent. Must be remediated for MENA market launch. |
| **N/A** | Check item does not apply (e.g., QAR currency for a non-financial product). |

## Relationship to Other Commands

| Command | Relationship |
|---------|-------------|
| `/compliance-check` | Regulatory compliance including Islamic calendar. `/i18n-check` covers the broader bilingual UI, not just calendar dates. |
| `/audit` | Full audit includes accessibility (which overlaps with RTL). `/i18n-check` goes deeper on Arabic-specific concerns. |
| `/pre-deploy` | Production readiness. `/i18n-check` SHOULD pass before `/pre-deploy` for any MENA-market product. |
