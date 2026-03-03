# OpenRouter Integration Guide

Reference for all ConnectSW products using OpenRouter as their AI model gateway.

---

## What is OpenRouter?

OpenRouter is a **unified API gateway** that gives access to hundreds of AI models (Claude, GPT, Gemini, Llama, Mistral, DeepSeek, etc.) through a **single OpenAI-compatible endpoint**. Switching models is just changing one string — no SDK changes needed.

- API endpoint: `https://openrouter.ai/api/v1`
- Dashboard: [openrouter.ai](https://openrouter.ai)
- Keys: [openrouter.ai/keys](https://openrouter.ai/keys)
- Free models: [openrouter.ai/collections/free-models](https://openrouter.ai/collections/free-models)

---

## API Key

> **NEVER commit the real API key to git. Store in `.env` only.**

```bash
# .env (gitignored)
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Generate or rotate keys at: [openrouter.ai/keys](https://openrouter.ai/keys)

---

## Dev vs Production Model Strategy

The core pattern: use **free models** in development, **paid reliable models** in production. The only thing that changes is the model string.

```bash
# .env.development  (or .env.local)
OPENROUTER_MODEL=google/gemma-3-27b-it:free

# .env.production
OPENROUTER_MODEL=anthropic/claude-sonnet-4-6
```

---

## Free Models (Tested — March 2026)

These are confirmed $0 cost, tested live against the OpenRouter API.

### Reliably Working

| Model ID | Context | Best For | Cost |
|---|---|---|---|
| `google/gemma-3-27b-it:free` | 131K | General use, all-rounder | **$0** |
| `google/gemma-3-12b-it:free` | 32K | Lightweight tasks | **$0** |
| `google/gemma-3-4b-it:free` | 32K | Simple completions | **$0** |
| `openrouter/free` | auto | Auto-selects best available free model | **$0** |

### Thinking/Reasoning Models (free but need special parsing)

These models return reasoning in a `reasoning` field, not `content`. Handle accordingly.

| Model ID | Context | Notes |
|---|---|---|
| `stepfun/step-3.5-flash:free` | 256K | Strong reasoning, parse `reasoning` field |
| `nvidia/nemotron-nano-9b-v2:free` | 128K | Parse `reasoning` field |
| `liquid/lfm-2.5-1.2b-thinking:free` | 32K | Lightweight thinking model |

### Full Free Model List (28 total as of March 2026)

```
arcee-ai/trinity-large-preview:free      131K
arcee-ai/trinity-mini:free               131K
cognitivecomputations/dolphin-mistral-24b-venice-edition:free  32K
google/gemma-3-12b-it:free               32K
google/gemma-3-27b-it:free               131K
google/gemma-3-4b-it:free                32K
google/gemma-3n-e2b-it:free              8K
google/gemma-3n-e4b-it:free              8K
liquid/lfm-2.5-1.2b-instruct:free        32K
liquid/lfm-2.5-1.2b-thinking:free        32K
meta-llama/llama-3.2-3b-instruct:free    131K
meta-llama/llama-3.3-70b-instruct:free   128K
mistralai/mistral-small-3.1-24b-instruct:free  128K
nousresearch/hermes-3-llama-3.1-405b:free  131K
nvidia/nemotron-3-nano-30b-a3b:free      256K
nvidia/nemotron-nano-12b-v2-vl:free      128K
nvidia/nemotron-nano-9b-v2:free          128K
openai/gpt-oss-120b:free                 131K  (requires privacy opt-in)
openai/gpt-oss-20b:free                  131K  (requires privacy opt-in)
openrouter/free                          200K  (auto-picks)
qwen/qwen3-235b-a22b-thinking-2507       131K
qwen/qwen3-4b:free                       40K
qwen/qwen3-coder:free                    262K
qwen/qwen3-next-80b-a3b-instruct:free    262K
qwen/qwen3-vl-235b-a22b-thinking         131K
qwen/qwen3-vl-30b-a3b-thinking           131K
stepfun/step-3.5-flash:free              256K
z-ai/glm-4.5-air:free                    131K
```

> Note: Free model availability changes. Always check [openrouter.ai/collections/free-models](https://openrouter.ai/collections/free-models) for the current list.
> Free tier limits: 50 req/day without credits, 1000 req/day with ≥$10 credits purchased.

---

## Recommended Models Per Stage

| Stage | Model | Cost |
|---|---|---|
| Development / Testing | `google/gemma-3-27b-it:free` | $0 |
| Development (auto) | `openrouter/free` | $0 |
| Staging / QA | `openai/gpt-4o-mini` | ~$0.15/1M tokens |
| Production (balanced) | `anthropic/claude-haiku-4-5` | Low |
| Production (quality) | `anthropic/claude-sonnet-4-6` | Mid |
| Production (best) | `anthropic/claude-opus-4-6` | High |

---

## Code Integration

### TypeScript / Node.js (OpenAI SDK)

```typescript
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://connectsw.dev",  // optional: shows in OR leaderboard
    "X-Title": "ConnectSW",                   // optional
  },
});

const MODEL = process.env.OPENROUTER_MODEL ?? "google/gemma-3-27b-it:free";

const response = await client.chat.completions.create({
  model: MODEL,
  messages: [{ role: "user", content: "Hello!" }],
});

console.log(response.choices[0].message.content);
```

### Python

```python
from openai import OpenAI
import os

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.environ["OPENROUTER_API_KEY"],
)

MODEL = os.environ.get("OPENROUTER_MODEL", "google/gemma-3-27b-it:free")

response = client.chat.completions.create(
    model=MODEL,
    messages=[{"role": "user", "content": "Hello!"}],
)

print(response.choices[0].message.content)
```

### Direct HTTP (curl)

```bash
curl https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "google/gemma-3-27b-it:free",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### Handling Thinking Models

Some free models (nemotron, stepfun, liquid-thinking) return reasoning tokens separately:

```typescript
const response = await client.chat.completions.create({
  model: MODEL,
  messages: [{ role: "user", content: "..." }],
});

const choice = response.choices[0].message;

// Standard models
const content = choice.content;

// Thinking models — fallback to reasoning if content is null
const output = content ?? (choice as any).reasoning ?? "";
```

---

## Getting the Live Free Model List Programmatically

```typescript
const res = await fetch("https://openrouter.ai/api/v1/models", {
  headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
});
const { data } = await res.json();

const freeModels = data.filter(
  (m: any) => m.pricing?.prompt === "0" && m.pricing?.completion === "0"
);
```

---

## Best Practices

### Security

- Store keys in `.env` only — never hardcode, never commit
- Add `.env` and `.env.*` (except `.env.example`) to `.gitignore`
- Rotate keys at [openrouter.ai/keys](https://openrouter.ai/keys) if ever exposed
- Use separate keys per product for easier auditing and rotation

### Cost Control

- Always default to a free model in `development` and `test` environments
- Set `max_tokens` limits to avoid runaway costs in production
- Monitor usage at [openrouter.ai/activity](https://openrouter.ai/activity)
- Set spend limits in the OpenRouter dashboard

### Reliability

- Free models have no SLA — use `openrouter/free` as fallback if a specific free model is down
- For production, add a fallback model via OpenRouter's `route` parameter:
  ```json
  { "route": "fallback", "models": ["anthropic/claude-sonnet-4-6", "openai/gpt-4o"] }
  ```
- Free model availability changes — don't hardcode free model IDs in production

### `.env.example` Template

Every product should include this in its root:

```bash
# .env.example — copy to .env and fill in values

# OpenRouter
OPENROUTER_API_KEY=sk-or-v1-your-key-here
OPENROUTER_MODEL=google/gemma-3-27b-it:free   # override for prod
```

---

## Fetching Current Free Models (CLI)

Run this to get the latest live list:

```bash
curl -s "https://openrouter.ai/api/v1/models" \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  | python3 -c "
import json, sys
data = json.load(sys.stdin)
free = [m for m in data['data'] if m.get('pricing',{}).get('prompt') == '0' and m.get('pricing',{}).get('completion') == '0']
for m in sorted(free, key=lambda x: x['id']):
    print(f\"{m['id']:55} {m.get('context_length','?')} tokens\")
print(f'\nTotal: {len(free)} free models')
"
```

---

*Last updated: March 2026 — re-run the CLI command above to refresh the free model list.*
