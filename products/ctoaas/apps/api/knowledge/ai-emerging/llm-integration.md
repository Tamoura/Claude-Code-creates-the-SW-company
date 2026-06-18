# LLM Integration Patterns for Products

Large Language Models have moved from research curiosity to production infrastructure in under three years. For CTOs, the challenge is no longer whether to integrate LLMs but how to do it responsibly: managing costs, latency, reliability, and user expectations while building defensible product value. This guide covers the architectural patterns, model selection criteria, and operational considerations for shipping LLM-powered features in production.

## When to Use / When NOT to Use

| Scenario | LLM Integration Recommended | LLM Integration NOT Recommended |
|----------|-----------------------------|---------------------------------|
| Unstructured text understanding (summarization, extraction, classification) | Yes -- LLMs excel at flexible text processing | When a regex or rule-based system achieves 99%+ accuracy |
| Natural language interfaces (chat, search, commands) | Yes -- core LLM capability | When users prefer structured forms and exact control |
| Content generation (drafts, suggestions, variations) | Yes -- with human review in the loop | When output must be deterministic and auditable (legal filings, financial reports) |
| Code generation and developer tools | Yes -- high ROI for developer productivity | When the codebase is proprietary and cannot be sent to external APIs |
| Data transformation and normalization | Maybe -- depends on accuracy requirements | When exact schema mapping is possible with traditional ETL |
| Real-time decision making (fraud detection, trading) | No -- latency too high for sub-100ms requirements | Use specialized ML models instead |
| Simple CRUD operations | No -- massive overkill | Standard application logic |

## Core Integration Patterns

### Pattern 1: Direct API Call

The simplest pattern. Your application calls an LLM API (OpenAI, Anthropic, Google) synchronously and returns the result to the user.

**Architecture:** User request -> Your API -> LLM API -> Your API -> User response

**When to use:** Prototyping, low-traffic features, chat interfaces where users expect a brief wait.

**Considerations:**
- Latency: 500ms-30s depending on model and output length
- Reliability: your uptime is now bounded by the LLM provider's uptime
- Cost: every request incurs token costs

### Pattern 2: Background Processing

LLM calls happen asynchronously. The user submits input, and results are delivered later (via notification, email, or polling).

**Architecture:** User input -> Queue (SQS, Redis, BullMQ) -> Worker -> LLM API -> Store result -> Notify user

**When to use:** Document processing, batch analysis, content generation pipelines where immediate response is not required.

**Benefits:** Decouples user experience from LLM latency. Enables retries on failure. Allows rate limiting to control costs.

### Pattern 3: RAG (Retrieval-Augmented Generation)

The model's response is grounded in your proprietary data. Documents are chunked, embedded into vectors, stored in a vector database, and retrieved at query time to provide context for the LLM.

**Architecture:**
1. **Indexing pipeline:** Documents -> Chunking -> Embedding model -> Vector database
2. **Query pipeline:** User query -> Embedding -> Vector search -> Top-K results -> LLM prompt (query + retrieved context) -> Response

**When to use:**
- The LLM needs access to your proprietary data (knowledge bases, documentation, internal policies)
- You need answers grounded in specific sources with citations
- The data changes frequently (re-index, not retrain)

**Key decisions:**
- **Chunk size:** 256-1024 tokens per chunk is typical. Smaller chunks improve precision but may lose context. Larger chunks provide more context but may dilute relevance.
- **Embedding model:** OpenAI `text-embedding-3-small` (cost-effective), `text-embedding-3-large` (higher quality), or open-source alternatives like `nomic-embed-text` or `bge-large`.
- **Vector database:** Pinecone (managed), Weaviate, Qdrant, pgvector (PostgreSQL extension), Chroma (lightweight). For most startups, pgvector is sufficient and avoids adding another managed service.
- **Retrieval strategy:** Start with simple cosine similarity. Add hybrid search (keyword + semantic) when pure semantic search misses exact term matches. Consider re-ranking with a cross-encoder for higher precision.

### Pattern 4: Fine-Tuning

Train the base model on your specific data to improve performance on your domain without providing context at inference time.

**When to use:**
- You have thousands of high-quality input-output examples
- You need consistent output format or style
- You want to reduce prompt size (and therefore cost and latency)
- RAG retrieval quality is insufficient for your use case

**When NOT to use:**
- You have less than 500 examples (start with few-shot prompting and RAG)
- Your data changes frequently (fine-tuning is a batch process)
- You need the model to cite specific sources (RAG is better for this)

**RAG vs Fine-Tuning is not either/or.** The best systems combine both: a fine-tuned model that understands your domain's language and output format, augmented with RAG for access to current, specific data.

## Prompt Engineering Fundamentals

Prompt engineering is the practice of designing inputs to LLMs to get reliable, high-quality outputs. It is the most cost-effective optimization you can make.

### Core techniques

**System prompts:** Set the model's role, constraints, and output format. Keep system prompts stable across requests for consistency.

**Few-shot examples:** Include 2-5 examples of desired input-output pairs in the prompt. This dramatically improves output consistency for structured tasks.

**Chain of thought:** Ask the model to "think step by step" or provide its reasoning before the answer. This improves accuracy on complex reasoning tasks at the cost of more output tokens.

**Structured output:** Request JSON, XML, or other structured formats. Use JSON schemas or Zod validation on the response. Models like GPT-4 and Claude support tool use / function calling, which forces structured output.

**Guardrails:** Include explicit constraints in the prompt: "If you are unsure, say 'I don't know' rather than guessing." "Do not include information not present in the provided context." "Respond only in English."

### Prompt management

Prompts are code. Version them, review them, and test them:
- Store prompts in version-controlled files, not inline strings
- Use templating (Handlebars, Jinja2) for variable substitution
- A/B test prompt variations with evaluation metrics
- Track prompt versions alongside model versions in your deployment pipeline

## Model Selection

| Model | Strengths | Weaknesses | Cost (per 1M tokens, approx.) | Best For |
|-------|-----------|------------|-------------------------------|----------|
| GPT-4o | Strong reasoning, multimodal, fast | Cost at scale, data privacy concerns | $2.50 input / $10 output | Complex reasoning, multimodal tasks |
| GPT-4o-mini | Good quality, very fast, cheap | Less capable on complex reasoning | $0.15 input / $0.60 output | High-volume, moderate-complexity tasks |
| Claude 3.5 Sonnet | Excellent at following instructions, long context (200K) | Slightly slower for short completions | $3 input / $15 output | Document analysis, coding, instruction-following |
| Claude 3.5 Haiku | Fast, cheap, good at structured tasks | Less capable on nuanced reasoning | $0.25 input / $1.25 output | Classification, extraction, high-volume |
| Gemini 1.5 Pro | Very long context (1M tokens), good multimodal | Variable quality on structured output | $1.25-5.00 input / $2.50-15 output | Very long documents, video/audio processing |
| Llama 3.1 (70B/405B) | Open-source, self-hostable, no data leaves your infra | Requires GPU infrastructure, lower quality than frontier models | Compute cost only | Data-sensitive applications, on-premises requirements |
| Mistral Large | Strong performance, European data residency | Smaller ecosystem | $2-4 input / $6-12 output | EU data sovereignty requirements |

**Model selection decision:** Start with a frontier model (GPT-4o or Claude Sonnet) for prototyping. Once the feature is validated, test whether a smaller/cheaper model (GPT-4o-mini, Haiku) achieves acceptable quality. Use the smallest model that meets your quality bar.

## Cost Management

LLM costs can spiral quickly. A feature that costs $50/month during development can cost $50,000/month at scale.

### Token budget framework

1. **Measure baseline costs.** Log every API call with token counts (input + output), model used, and feature identifier. Build a cost dashboard from day one.

2. **Set per-user and per-feature budgets.** "This feature can spend at most $0.05 per user per day." Enforce with rate limiting and model tiering.

3. **Optimize the prompt.** Shorter prompts cost less. Remove unnecessary context, examples, and instructions. A 500-token prompt that works is better than a 2,000-token prompt that works slightly better.

4. **Cache aggressively.** If the same question with the same context produces the same answer, cache it. Semantic caching (cache responses for semantically similar queries) is more sophisticated but significantly reduces costs.

5. **Use tiered models.** Route simple queries to cheap models (GPT-4o-mini, Haiku) and complex queries to expensive models (GPT-4o, Sonnet). Build a classifier or use heuristics (query length, complexity indicators) to route.

6. **Batch when possible.** Anthropic and OpenAI offer batch APIs with 50% cost reduction for non-real-time workloads.

### Cost estimation formula

```
Monthly cost = (avg_input_tokens + avg_output_tokens) * requests_per_month * cost_per_token
```

Example: 500 input tokens + 200 output tokens, 100K requests/month, using GPT-4o-mini:
- Input: 500 * 100,000 * $0.00000015 = $7.50
- Output: 200 * 100,000 * $0.0000006 = $12.00
- Total: $19.50/month

Same workload with GPT-4o:
- Input: 500 * 100,000 * $0.0000025 = $125
- Output: 200 * 100,000 * $0.000010 = $200
- Total: $325/month

The 16x cost difference between models is why model selection matters.

## Build vs API

| Factor | Build (Self-Hosted Open Source) | Buy (API Providers) |
|--------|-------------------------------|---------------------|
| Data privacy | Full control, data never leaves your infrastructure | Data sent to third-party API (review provider's data policies) |
| Cost at scale | Lower marginal cost but high fixed cost (GPU infrastructure) | Higher marginal cost but zero fixed cost |
| Latency | Can optimize for your specific use case | Shared infrastructure, variable latency |
| Model quality | Open-source models lag frontier models by 6-12 months | Access to best-in-class models immediately |
| Operational overhead | Significant (GPU procurement, model serving, scaling) | Minimal (API key and HTTP client) |
| Time to market | Weeks to months for infrastructure setup | Hours to days |
| Flexibility | Full control over model, fine-tuning, quantization | Limited to provider's API capabilities |

**Recommendation for most startups:** Start with APIs. Only self-host when you have a clear data privacy requirement, proven unit economics that justify the infrastructure investment, or a competitive advantage that depends on model customization. The breakeven point for self-hosting is typically 1M+ API calls per month with a dedicated ML engineering team.

## Real-World Examples

**Notion AI (2023):** Notion integrated LLMs for writing assistance, summarization, and translation directly into their document editor. They used a combination of direct API calls (for interactive features) and background processing (for document-level summarization). Key lesson: they started with a waitlist to control costs and gather usage data before scaling.

**Cursor (2023-2024):** Cursor built an AI-powered code editor using a combination of RAG (indexing the user's codebase) and frontier model API calls. They use model routing to balance cost and quality: simple completions go to smaller models, complex edits go to GPT-4 or Claude. Their approach demonstrates that the integration architecture (context management, model routing, streaming UX) is often more valuable than the underlying model.

**Stripe Radar:** Stripe uses ML models (not LLMs specifically) for fraud detection, processing millions of transactions per second. This illustrates that LLMs are not the right tool for every AI task. For classification at scale with low latency, traditional ML models trained on structured data are more appropriate.

**Perplexity AI (2023-2024):** Built a search engine using RAG at scale. Their architecture demonstrates production RAG: web crawling for indexing, multi-model routing for different query types, and citation generation from retrieved sources. They showed that RAG quality depends more on retrieval quality than model quality.

## Decision Framework

**Add LLM integration to your product when:**
- The task involves unstructured data that resists traditional programming
- Users currently spend significant time on tasks the LLM can assist with
- Imperfect output (with human review) is still valuable
- You can start with a narrow, well-defined use case and expand
- The cost per interaction is sustainable at your scale

**Do NOT add LLM integration when:**
- A deterministic algorithm solves the problem reliably
- Errors are unacceptable and cannot be caught by human review
- Latency requirements are under 100ms
- The feature does not meaningfully differentiate your product
- You are adding AI because investors expect it, not because users need it

## Common Mistakes

1. **Building features around model capabilities instead of user problems.** Start with the user problem. If an LLM helps solve it, great. If not, do not force it.

2. **Not implementing fallbacks.** LLM APIs go down, rate limit, or return garbage. Every LLM-powered feature needs a graceful degradation path: queue and retry, show cached results, or disable the feature with an informative message.

3. **Ignoring output validation.** LLMs hallucinate. Validate structured outputs against schemas. Cross-reference generated facts against source data. Never present LLM output as authoritative without verification.

4. **Sending sensitive data without a data processing agreement.** Enterprise customers will ask where their data goes. Understand your LLM provider's data retention and training policies before building features that process customer data.

5. **Not measuring quality systematically.** "It seems to work well" is not a quality metric. Build evaluation datasets. Measure precision, recall, and relevance for your specific use case. Track quality over time as models change.

6. **Prompt injection vulnerabilities.** If users can influence the prompt (via chat input, document content, or any user-controlled text), they can potentially override your instructions. Implement input sanitization, output validation, and consider using separate system/user message boundaries.

## Key Metrics to Track

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| Cost per interaction | Defined per feature, tracked daily | Prevents cost surprises at scale |
| Latency (P50/P95/P99) | P50 <2s for interactive features | User experience directly tied to response time |
| Error rate (API failures + validation failures) | <1% | Reliability drives user trust |
| Output quality score (human evaluation) | >4/5 on relevance, accuracy, helpfulness | Quality determines whether users adopt the feature |
| Hallucination rate | <5% (task-dependent) | Critical for trust and accuracy |
| Token efficiency (output quality / tokens used) | Improving over time | Measures prompt optimization progress |
| Feature adoption rate | >30% of eligible users within 3 months | Validates that the feature solves a real problem |
| Cache hit rate (if caching) | >20% for common queries | Directly reduces cost and latency |

## References

- Anthropic. "Claude API Documentation" -- https://docs.anthropic.com/
- OpenAI. "API Reference" and "Best Practices" -- https://platform.openai.com/docs/
- Lewis, P. et al. "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks." NeurIPS 2020.
- Langchain documentation. "RAG Best Practices" -- https://python.langchain.com/docs/
- Pinecone. "Vector Database Guide" -- https://www.pinecone.io/learn/
- Simon Willison's blog. Extensive practical coverage of LLM integration patterns -- https://simonwillison.net/
- Latent Space podcast. Industry practitioner interviews on LLM production systems -- https://www.latent.space/
- Cursor blog. "How We Build AI Features" -- https://cursor.sh/blog
- Notion Engineering Blog. "Building Notion AI" -- https://www.notion.so/blog
