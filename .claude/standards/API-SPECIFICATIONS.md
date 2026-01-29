# API Specification Standards

**Last Updated**: 2026-01-29

## Standard Filename

All products MUST use the standardized filename for API specifications:

```
products/{product-name}/docs/api-contract.yml
```

**Rationale**:
- "Contract" emphasizes the API as a binding agreement between services
- Consistent naming aids automation and tooling
- OpenAPI/Swagger tools can be configured to expect this filename

---

## File Format

Use **OpenAPI 3.0.3** or later for all API specifications.

```yaml
openapi: 3.0.3
info:
  title: {Product Name} API
  description: |
    Brief description of the API purpose and key features.
  version: 1.0.0

servers:
  - url: http://localhost:{port}/api/v1
    description: Development
  - url: https://api.{product}.com/v1
    description: Production

paths:
  # API endpoints
  ...

components:
  schemas:
    # Data models
    ...
  securitySchemes:
    # Auth methods
    ...
```

---

## Required Sections

All API specifications MUST include:

1. **Authentication** - How to authenticate requests
2. **Rate Limits** - Request limits and headers
3. **Error Responses** - Standard error format (RFC 7807 recommended)
4. **Versioning** - API version strategy
5. **Webhooks** (if applicable) - Event notifications

---

## Example Structure

```
products/stablecoin-gateway/
└── docs/
    ├── api-contract.yml          # ✅ Standardized name
    ├── API.md                     # Human-readable API guide
    └── guides/
        ├── authentication.md
        ├── webhook-integration.md
        └── rate-limits.md
```

---

## Validation

Before merging any PR that modifies `api-contract.yml`, run:

```bash
# Validate OpenAPI spec
npx @redocly/cli lint products/{product}/docs/api-contract.yml

# Generate documentation (optional)
npx @redocly/cli build-docs products/{product}/docs/api-contract.yml \
  -o products/{product}/docs/api-docs.html
```

---

## Task Graph Integration

When creating architecture tasks, the task graph MUST reference the standardized filename:

```yaml
- id: "ARCH-01"
  name: "Design System Architecture"
  agent: "architect"
  produces:
    - name: "API Contract"
      type: "file"
      path: "products/{product}/docs/api-contract.yml"  # ✅ Standard path
```

---

## Migration Path

For existing products using different names:

1. Rename file to `api-contract.yml`
2. Update all references in documentation
3. Update CI/CD scripts
4. Create symlink for backward compatibility (optional, temporary)

```bash
# Example migration
cd products/old-product/docs
mv api-schema.yml api-contract.yml
ln -s api-contract.yml api-schema.yml  # Temporary compatibility
```

---

## Non-Compliance

**DO NOT USE**:
- ❌ `api-schema.yml` (ambiguous - could be just schemas)
- ❌ `api-spec.yml` (too generic)
- ❌ `openapi.yml` (tooling-specific, not descriptive)
- ❌ `swagger.yml` (outdated naming convention)

**ALWAYS USE**:
- ✅ `api-contract.yml` (standard, clear, consistent)
