# ADR-001: Anthropic Claude API for AI Invoice Generation

## Status

Accepted

## Context

InvoiceForge's core feature is AI-powered invoice generation from natural
language input. The system must parse freeform text and extract structured
data: client name, line items (description, quantity, rate, unit type),
tax rate, and due date. The AI must return reliable, consistently
structured JSON that maps directly to our invoice schema.

We need to select an AI provider that excels at:

1. **Structured output**: Returning valid JSON that matches a defined schema
2. **Instruction following**: Strictly following extraction rules (never
   hallucinate amounts, recognize varied input formats)
3. **Speed**: Sub-5-second response times for invoice generation (p95)
4. **Cost efficiency**: Affordable at scale (thousands of generations/month)
5. **Reliability**: High uptime, consistent behavior across calls

## Decision

Use the **Anthropic Claude API** (model: `claude-sonnet-4-20250514`) for all
AI invoice generation.

### Why Claude

- **Superior instruction following**: Claude excels at following complex
  system prompts with many rules. Invoice extraction has nuanced rules
  (unit type detection, tax parsing, ambiguity handling) that require
  strict adherence.
- **Structured output reliability**: Claude consistently returns valid
  JSON when instructed, with very low malformation rates. This reduces
  the need for retry logic.
- **Safety and accuracy**: Claude is trained to avoid hallucination. When
  it cannot extract data from the input, it says so rather than making
  up amounts -- critical for financial documents.
- **ConnectSW alignment**: Anthropic is our company's AI partner. Using
  Claude maintains consistency across products and simplifies API key
  management.
- **Cost**: Claude Sonnet is significantly cheaper than GPT-4 for
  equivalent quality on structured extraction tasks. At ~$3/M input
  tokens and ~$15/M output tokens, invoice generation costs approximately
  $0.005-0.01 per invoice.
- **Speed**: Claude Sonnet typically responds in 1-3 seconds for invoice
  extraction prompts, well within our 5-second p95 target.

### Integration Approach

- Use the official `@anthropic-ai/sdk` npm package
- System prompt stored in code (version-controlled), not in the database
- User input passed as the user message
- Response validated with Zod schema before processing
- Server-side recalculation of all arithmetic (never trust AI math)

## Consequences

### Positive

- Strong structured output reduces parsing errors and retry overhead
- Low hallucination risk for financial data
- Fast response times for good UX
- Cost-effective for freemium model ($0.01/invoice max)
- Consistent with ConnectSW's AI provider strategy

### Negative

- Single vendor dependency for core feature
- Claude API outages directly impact invoice creation
- Model updates could change extraction behavior (mitigated by pinning
  model version)

### Neutral

- Need to maintain a well-engineered system prompt (ongoing effort)
- Must implement fallback manual form for when AI is unavailable

## Alternatives Considered

### OpenAI GPT-4

- **Pros**: Largest ecosystem, function calling support, structured outputs mode
- **Cons**: Higher cost (GPT-4 is 3-5x more expensive than Claude Sonnet for
  equivalent quality), occasionally over-generates (adds items not in input)
- **Why rejected**: Cost is significantly higher for a freemium product where
  AI generation cost is a direct unit economics concern. Claude's instruction
  following is equal or better for this use case.

### OpenAI GPT-3.5 Turbo

- **Pros**: Very cheap (~$0.001/invoice), fast
- **Cons**: Lower accuracy on complex multi-line-item invoices, struggles
  with ambiguous unit type detection, higher JSON malformation rate
- **Why rejected**: Quality is insufficient for a product where invoice
  accuracy is the core value proposition. Users would need to manually
  correct too many invoices, defeating the purpose.

### Local/Self-Hosted Model (Llama 3, Mistral)

- **Pros**: No per-request cost, full data privacy, no vendor dependency
- **Cons**: Requires GPU infrastructure ($500+/month), model quality is
  lower for structured extraction, significant ops overhead, slower
  inference without dedicated hardware
- **Why rejected**: Infrastructure cost and complexity are prohibitive
  for a lean startup. Quality gap is too large. Can revisit when
  open-source models catch up.

## References

- Anthropic Claude API Documentation: https://docs.anthropic.com
- Claude Sonnet pricing: https://www.anthropic.com/pricing
- InvoiceForge PRD Section 6.1: FR-007 through FR-014
