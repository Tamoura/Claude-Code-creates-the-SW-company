# Compliance Check Command

Validate Shariah and QFCRA regulatory compliance for ConnectSW financial products.

## Usage

```
/compliance-check <product-name>
```

Examples:
```
/compliance-check stablecoin-gateway
/compliance-check connectgrc
```

## Arguments

- **product-name**: Product directory name under `products/` (e.g., `stablecoin-gateway`, `connectgrc`). Must be a financial product with regulatory obligations.

## What This Command Does

This command performs a targeted compliance audit for financial products operating under Qatar Financial Centre Regulatory Authority (QFCRA) jurisdiction and Islamic finance (Shariah) requirements. It inspects source code, configuration, documentation, and data models to verify adherence to interest-free transaction models, halal certification references, QFCRA regulatory requirements, and Arabic/Islamic calendar support.

This check is designed for products that handle financial transactions, risk/governance reporting, or regulatory compliance workflows. Running it against non-financial products will produce mostly N/A results.

**Applicable products**: `stablecoin-gateway`, `connectgrc`, and any future financial product.

**Reference protocols**:
- `.specify/memory/constitution.md` (Article VI: Quality, Article IX: Documentation)
- `.claude/protocols/verification-before-completion.md` (5-step verification gate)
- `.claude/protocols/anti-rationalization.md` (The 1% Rule: if a check *might* apply, it MUST be run)

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

echo "Compliance check target: $ARGUMENTS"
echo "Product path: $PRODUCT_DIR"
```

### Step 2: Load Product Context

Read the product context to understand its domain and financial obligations:
- File: `products/$ARGUMENTS/README.md`
- File: `products/$ARGUMENTS/.claude/addendum.md` (if exists)
- File: `products/$ARGUMENTS/docs/PRD.md` (if exists)

Determine which compliance categories apply based on the product's domain:
- **Shariah compliance**: Any product handling financial transactions, token issuance, lending, or payment flows
- **QFCRA compliance**: Any product operating under QFC jurisdiction or handling regulated financial activities
- **Islamic calendar**: Any product with date-dependent financial logic (settlement dates, maturity, reporting periods)

### Step 3: Interest-Free Transaction Model Verification

Scan for violations of interest-free (riba-free) financial models.

**3a. Prohibited interest/usury patterns**:

```bash
echo "=== CHECK: Interest-Free Transaction Model ==="

# Search for interest-related terms in source code (potential riba violations)
echo "--- Scanning for interest/usury references ---"
grep -rn --include="*.ts" --include="*.tsx" --include="*.js" \
  -iE "(interest[_-]?rate|apr[^a-z]|annual[_-]?percentage|usury|compound[_-]?interest|accrued[_-]?interest|interest[_-]?payment|loan[_-]?interest)" \
  "$PRODUCT_DIR/apps/" 2>/dev/null || echo "  No interest-related terms found in source"

# Check for interest calculations in business logic
echo "--- Scanning for interest calculation patterns ---"
grep -rn --include="*.ts" --include="*.tsx" \
  -E "(calculateInterest|interestAmount|interestAccrual|compoundRate)" \
  "$PRODUCT_DIR/apps/" 2>/dev/null || echo "  No interest calculation functions found"
```

**3b. Shariah-compliant alternatives verification**:

```bash
# Check for Shariah-compliant financial model references
echo "--- Scanning for Shariah-compliant model references ---"
grep -rn --include="*.ts" --include="*.tsx" --include="*.md" \
  -iE "(murabaha|musharakah|mudarabah|ijara|sukuk|wakalah|tawarruq|salam|istisna|qard[_-]?hasan|profit[_-]?sharing|fee[_-]?based)" \
  "$PRODUCT_DIR/" 2>/dev/null || echo "  WARN: No Shariah-compliant financial model references found"
```

**3c. Transaction model in data layer**:

```bash
# Check Prisma schema for interest-related fields
echo "--- Scanning data model for interest fields ---"
if [ -f "$PRODUCT_DIR/apps/api/prisma/schema.prisma" ]; then
  grep -n -iE "(interest|apr|usury|compound)" \
    "$PRODUCT_DIR/apps/api/prisma/schema.prisma" 2>/dev/null || echo "  No interest fields in schema"
else
  echo "  No Prisma schema found"
fi
```

### Step 4: Halal Certification References

Verify that financial instruments and transaction types reference halal certification where applicable.

```bash
echo ""
echo "=== CHECK: Halal Certification References ==="

# Check for Shariah board/certification references in docs
echo "--- Documentation references ---"
grep -rn --include="*.md" \
  -iE "(shariah[_-]?board|shariah[_-]?certif|halal[_-]?certif|shariah[_-]?complian|shariah[_-]?advisor|fatwa|shariah[_-]?audit|shariah[_-]?review|shariah[_-]?governance)" \
  "$PRODUCT_DIR/docs/" 2>/dev/null || echo "  WARN: No Shariah governance references in documentation"

# Check for Shariah compliance validation in code
echo "--- Code-level Shariah validation ---"
grep -rn --include="*.ts" --include="*.tsx" \
  -iE "(shariahComplian|isHalal|shariahValid|complianceCheck|shariahApproved|halalStatus)" \
  "$PRODUCT_DIR/apps/" 2>/dev/null || echo "  WARN: No Shariah validation logic in source code"

# Check for Shariah-related configuration
echo "--- Configuration references ---"
grep -rn --include="*.ts" --include="*.json" --include="*.yml" --include="*.yaml" --include="*.env*" \
  -iE "(SHARIAH|HALAL|ISLAMIC_FINANCE)" \
  "$PRODUCT_DIR/" 2>/dev/null || echo "  INFO: No Shariah-related configuration keys found"
```

### Step 5: QFCRA Regulatory Requirements

Verify compliance with Qatar Financial Centre Regulatory Authority requirements.

```bash
echo ""
echo "=== CHECK: QFCRA Regulatory Requirements ==="

# Check for QFCRA references in documentation
echo "--- QFCRA documentation references ---"
grep -rn --include="*.md" \
  -iE "(QFCRA|Qatar Financial Centre|QFC[^A-Za-z]|regulatory[_-]?authority|QFCA|anti[_-]?money[_-]?laundering|AML|KYC|know[_-]?your[_-]?customer|CTF|counter[_-]?terrorism[_-]?financing)" \
  "$PRODUCT_DIR/docs/" 2>/dev/null || echo "  WARN: No QFCRA regulatory references in documentation"

# Check for KYC/AML implementation
echo "--- KYC/AML implementation ---"
grep -rn --include="*.ts" --include="*.tsx" \
  -iE "(kyc|aml|sanctions[_-]?check|pep[_-]?check|identity[_-]?verif|customer[_-]?due[_-]?diligence|enhanced[_-]?due[_-]?diligence|transaction[_-]?monitoring|suspicious[_-]?activity)" \
  "$PRODUCT_DIR/apps/" 2>/dev/null || echo "  WARN: No KYC/AML logic found in source code"

# Check for regulatory reporting endpoints or services
echo "--- Regulatory reporting ---"
grep -rn --include="*.ts" \
  -iE "(regulatory[_-]?report|compliance[_-]?report|audit[_-]?trail|audit[_-]?log|transaction[_-]?record|regulatory[_-]?filing)" \
  "$PRODUCT_DIR/apps/" 2>/dev/null || echo "  WARN: No regulatory reporting implementation found"

# Check for data retention policies (QFCRA requires transaction records)
echo "--- Data retention ---"
grep -rn --include="*.ts" --include="*.md" \
  -iE "(retention[_-]?polic|data[_-]?retention|record[_-]?keeping|archive[_-]?polic|purge[_-]?polic)" \
  "$PRODUCT_DIR/" 2>/dev/null || echo "  WARN: No data retention policy references found"

# Check for licensing/registration references
echo "--- Licensing references ---"
grep -rn --include="*.md" --include="*.ts" \
  -iE "(license[_-]?number|registration[_-]?number|regulated[_-]?entity|authorized[_-]?firm|QFC[_-]?license)" \
  "$PRODUCT_DIR/" 2>/dev/null || echo "  INFO: No QFC licensing references found"
```

### Step 6: Arabic/Islamic Calendar Support

Verify support for Hijri calendar dates in date-dependent financial logic.

```bash
echo ""
echo "=== CHECK: Arabic/Islamic Calendar Support ==="

# Check for Hijri/Islamic calendar implementation
echo "--- Hijri calendar implementation ---"
grep -rn --include="*.ts" --include="*.tsx" --include="*.json" \
  -iE "(hijri|islamic[_-]?calendar|umm[_-]?al[_-]?qura|hijra|islamic[_-]?date|hijri[_-]?date|lunar[_-]?calendar|intl.*islamic)" \
  "$PRODUCT_DIR/" 2>/dev/null || echo "  WARN: No Hijri calendar references found"

# Check for dual calendar display (Gregorian + Hijri)
echo "--- Dual calendar support ---"
grep -rn --include="*.ts" --include="*.tsx" \
  -iE "(dualCalendar|hijriGregorian|gregorianHijri|formatHijri|toHijri|fromHijri)" \
  "$PRODUCT_DIR/apps/" 2>/dev/null || echo "  WARN: No dual calendar formatting found"

# Check for Islamic financial calendar events (Ramadan, Eid settlement dates)
echo "--- Islamic financial calendar events ---"
grep -rn --include="*.ts" --include="*.tsx" --include="*.json" \
  -iE "(ramadan|eid[_-]?al|muharram|dhul[_-]?hijja|islamic[_-]?holiday|islamic[_-]?event|prayer[_-]?time)" \
  "$PRODUCT_DIR/" 2>/dev/null || echo "  INFO: No Islamic calendar event references found"

# Check for date libraries that support Hijri
echo "--- Date library support ---"
grep -rn --include="*.json" \
  -E "(moment-hijri|@hijri|hijri-date|islamic-calendar)" \
  "$PRODUCT_DIR/" 2>/dev/null || echo "  INFO: No Hijri date library in dependencies"
```

### Step 7: Generate Compliance Report

After running all checks, compile results into a structured report.

**Report format**:

```markdown
## Compliance Check Report: [product-name]

**Date**: [YYYY-MM-DD]
**Product**: [product-name]
**Checker**: Security Engineer Agent (Compliance Module)
**Jurisdiction**: Qatar Financial Centre (QFC)

### Summary

[2-3 sentence overall compliance posture assessment]

### Results

| # | Category | Check Item | Status | Details |
|---|----------|-----------|--------|---------|
| 1 | Shariah | No interest/usury calculations in source | PASS/WARN/FAIL | [file:line or "Clean"] |
| 2 | Shariah | Shariah-compliant financial model referenced | PASS/WARN/FAIL | [model type or "Missing"] |
| 3 | Shariah | No interest fields in data model | PASS/WARN/FAIL | [field or "Clean"] |
| 4 | Shariah | Halal certification references in docs | PASS/WARN/FAIL | [location or "Missing"] |
| 5 | Shariah | Shariah validation logic in code | PASS/WARN/FAIL | [function or "Missing"] |
| 6 | Shariah | Shariah governance configuration | PASS/WARN/FAIL | [key or "Missing"] |
| 7 | QFCRA | QFCRA regulatory references in docs | PASS/WARN/FAIL | [location or "Missing"] |
| 8 | QFCRA | KYC/AML implementation | PASS/WARN/FAIL | [modules or "Missing"] |
| 9 | QFCRA | Regulatory reporting capability | PASS/WARN/FAIL | [endpoints or "Missing"] |
| 10 | QFCRA | Data retention policy defined | PASS/WARN/FAIL | [policy or "Missing"] |
| 11 | QFCRA | QFC licensing references | PASS/WARN/FAIL | [ref or "N/A"] |
| 12 | Calendar | Hijri calendar support | PASS/WARN/FAIL | [library or "Missing"] |
| 13 | Calendar | Dual calendar display (Gregorian + Hijri) | PASS/WARN/FAIL | [component or "Missing"] |
| 14 | Calendar | Islamic financial calendar events | PASS/WARN/FAIL | [events or "N/A"] |

### Scoring

- **PASS**: [count] / 14
- **WARN**: [count] / 14
- **FAIL**: [count] / 14

### Compliance Verdict

| Category | Verdict |
|----------|---------|
| Shariah Compliance | PASS / WARN / FAIL |
| QFCRA Regulatory | PASS / WARN / FAIL |
| Islamic Calendar | PASS / WARN / FAIL |
| **Overall** | **PASS / WARN / FAIL** |

Verdict logic:
- **PASS**: All checks pass or have only informational notes
- **WARN**: One or more checks have warnings but no failures. Product may proceed with documented exceptions.
- **FAIL**: One or more checks failed. Product MUST NOT proceed to production until failures are resolved.

### Remediation Actions

| Priority | Action | Owner | Category |
|----------|--------|-------|----------|
| [P0/P1/P2] | [specific action] | [agent role] | [Shariah/QFCRA/Calendar] |

### Regulatory Notes

- QFCRA requires all regulated firms to maintain transaction records for a minimum of 6 years
- Shariah compliance must be validated by a qualified Shariah Supervisory Board before public launch
- Dual calendar display is a regulatory expectation for QFC-licensed financial products serving the local market
- AML/KYC controls must align with QFCRA Rulebook Chapter 11 (Anti-Money Laundering and Combating the Financing of Terrorism)
```

### Step 8: Save Report

Save the compliance report to:
```
products/$ARGUMENTS/docs/quality-reports/compliance-check-[YYYY-MM-DD].md
```

Create the directory if it does not exist:
```bash
mkdir -p "products/$ARGUMENTS/docs/quality-reports"
```

### Step 9: Log to Audit Trail

```bash
.claude/scripts/post-task-update.sh security-engineer COMPLIANCE-CHECK-$ARGUMENTS $ARGUMENTS success 0 "Compliance check completed: [verdict]"
```

## Status Definitions

| Status | Meaning |
|--------|---------|
| **PASS** | Check item fully satisfied. Evidence found in code, config, or documentation. |
| **WARN** | Check item partially satisfied or not verifiable from source alone. Manual review recommended. |
| **FAIL** | Check item violated. Prohibited pattern found or mandatory requirement missing. Must be remediated before production. |
| **N/A** | Check item does not apply to this product's domain or current scope. |

## Relationship to Other Commands

| Command | Relationship |
|---------|-------------|
| `/audit` | Full production audit (11 dimensions). `/compliance-check` is a focused subset for financial regulatory compliance. |
| `/security-scan` | OWASP Top 10 technical security. `/compliance-check` covers regulatory and Shariah compliance, not technical AppSec. |
| `/pre-deploy` | Production readiness checklist. `/compliance-check` MUST pass before `/pre-deploy` for financial products. |
