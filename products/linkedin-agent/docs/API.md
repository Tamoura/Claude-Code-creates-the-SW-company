# LinkedIn Agent - API Documentation

**Base URL**: `http://localhost:5010/api`
**Content-Type**: `application/json`

---

## Table of Contents

- [Health](#health)
- [Trend Analysis](#trend-analysis)
- [Posts](#posts)
- [Translation](#translation)
- [Carousels](#carousels)
- [Models](#models)

---

## Health

### GET /api/health

Returns the health status of the API server.

**Response** `200 OK`

```json
{
  "status": "ok",
  "timestamp": "2026-02-15T12:00:00.000Z",
  "version": "1.0.0",
  "services": {
    "database": "connected",
    "openrouter": "connected"
  }
}
```

---

## Trend Analysis

### POST /api/trends/analyze

Analyze pasted content (articles, posts, text) to extract trending topics and angles.

**Request Body**

```json
{
  "content": "string (required) - The text content to analyze. Can be article text, LinkedIn post, tweet, etc.",
  "language": "string (optional) - 'ar' | 'en' | 'auto'. Default: 'auto' (auto-detect)",
  "context": "string (optional) - Additional context about the user's industry or focus area"
}
```

**Response** `200 OK`

```json
{
  "id": "uuid",
  "topics": [
    {
      "title": "string - Topic name",
      "titleAr": "string - Topic name in Arabic",
      "summary": "string - Brief description",
      "relevanceScore": 0.85,
      "talkingPoints": [
        "string - Key point 1",
        "string - Key point 2"
      ],
      "suggestedAngles": [
        {
          "angle": "string - Angle description",
          "tone": "professional | conversational | educational | provocative",
          "targetAudience": "string"
        }
      ],
      "hashtags": ["#AI", "#TechLeadership", "#تقنية"]
    }
  ],
  "sourceLanguage": "en",
  "analyzedAt": "2026-02-15T12:00:00.000Z",
  "modelUsed": "google/gemini-2.0-flash"
}
```

**Example**

```bash
curl -X POST http://localhost:5010/api/trends/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "content": "OpenAI just released GPT-5 with improved reasoning capabilities and native multimodal support. The model shows 40% improvement on coding benchmarks...",
    "language": "auto",
    "context": "AI engineering"
  }'
```

**Errors**

| Status | Description |
|--------|-------------|
| 400 | Missing or empty `content` field |
| 429 | Rate limit exceeded (max 10 analyses per minute) |
| 502 | OpenRouter API error |

---

### GET /api/trends

List previously analyzed trends.

**Query Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 20 | Items per page (max 100) |
| language | string | all | Filter by source language: 'ar', 'en', 'all' |

**Response** `200 OK`

```json
{
  "data": [
    {
      "id": "uuid",
      "topics": [...],
      "sourceLanguage": "en",
      "analyzedAt": "2026-02-15T12:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

**Example**

```bash
curl http://localhost:5010/api/trends?page=1&limit=10&language=en
```

---

## Posts

### POST /api/posts/generate

Generate LinkedIn post(s) from a topic or trend analysis.

**Request Body**

```json
{
  "topicId": "uuid (optional) - Reference to a trend analysis topic",
  "topic": "string (optional) - Custom topic if not using a trend analysis",
  "language": "string (required) - 'ar' | 'en' | 'both'",
  "tone": "string (optional) - 'professional' | 'conversational' | 'educational' | 'provocative'. Default: 'professional'",
  "format": "string (optional) - 'text' | 'carousel' | 'poll' | 'infographic' | 'link'. Default: auto-recommended",
  "variants": "number (optional) - Number of post variants to generate (1-3). Default: 2",
  "instructions": "string (optional) - Additional instructions for the AI (e.g., 'include a personal anecdote')"
}
```

**Response** `200 OK`

```json
{
  "posts": [
    {
      "id": "uuid",
      "content": "string - The full post text",
      "language": "ar",
      "tone": "professional",
      "format": "text",
      "formatRecommendation": {
        "recommended": "carousel",
        "reasoning": "This topic covers a step-by-step process that would perform 3x better as a carousel based on LinkedIn engagement data.",
        "alternatives": [
          {
            "format": "text",
            "reasoning": "Viable but lower expected engagement for tutorial content"
          }
        ]
      },
      "hashtags": ["#الذكاء_الاصطناعي", "#تقنية", "#AI"],
      "estimatedReadTime": "45 seconds",
      "hookPreview": "string - First 2 lines (what shows before 'see more')",
      "wordCount": 210,
      "status": "draft",
      "createdAt": "2026-02-15T12:00:00.000Z"
    }
  ],
  "modelUsed": "anthropic/claude-sonnet-4",
  "generationTime": 4200
}
```

**Example**

```bash
curl -X POST http://localhost:5010/api/posts/generate \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "How to evaluate LLMs for production use",
    "language": "ar",
    "tone": "educational",
    "variants": 2
  }'
```

**Errors**

| Status | Description |
|--------|-------------|
| 400 | Neither `topicId` nor `topic` provided |
| 404 | `topicId` not found |
| 429 | Rate limit exceeded (max 20 generations per hour) |
| 502 | OpenRouter API error |

---

### GET /api/posts

List all generated posts.

**Query Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 20 | Items per page (max 100) |
| language | string | all | Filter: 'ar', 'en', 'all' |
| status | string | all | Filter: 'draft', 'published', 'archived', 'all' |
| format | string | all | Filter: 'text', 'carousel', 'poll', 'infographic', 'link', 'all' |
| sortBy | string | createdAt | Sort field: 'createdAt', 'updatedAt' |
| order | string | desc | Sort order: 'asc', 'desc' |

**Response** `200 OK`

```json
{
  "data": [
    {
      "id": "uuid",
      "content": "string",
      "language": "ar",
      "tone": "professional",
      "format": "text",
      "status": "draft",
      "hashtags": ["#AI"],
      "wordCount": 210,
      "createdAt": "2026-02-15T12:00:00.000Z",
      "updatedAt": "2026-02-15T12:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 85,
    "totalPages": 5
  }
}
```

**Example**

```bash
curl "http://localhost:5010/api/posts?language=ar&status=draft&limit=10"
```

---

### GET /api/posts/:id

Get a single post by ID.

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | uuid | Post ID |

**Response** `200 OK`

```json
{
  "id": "uuid",
  "content": "string",
  "language": "ar",
  "tone": "professional",
  "format": "text",
  "formatRecommendation": {
    "recommended": "text",
    "reasoning": "Personal story content performs best as text posts.",
    "alternatives": []
  },
  "hashtags": ["#AI", "#تقنية"],
  "hookPreview": "string",
  "wordCount": 210,
  "status": "draft",
  "trendAnalysisId": "uuid | null",
  "carousel": null,
  "translations": [],
  "createdAt": "2026-02-15T12:00:00.000Z",
  "updatedAt": "2026-02-15T12:00:00.000Z"
}
```

**Errors**

| Status | Description |
|--------|-------------|
| 404 | Post not found |

**Example**

```bash
curl http://localhost:5010/api/posts/550e8400-e29b-41d4-a716-446655440000
```

---

### PATCH /api/posts/:id

Update a post (edit content, change status, etc.).

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | uuid | Post ID |

**Request Body** (all fields optional)

```json
{
  "content": "string - Updated post content",
  "status": "string - 'draft' | 'published' | 'archived'",
  "hashtags": ["string array - Updated hashtags"],
  "tone": "string - Updated tone"
}
```

**Response** `200 OK`

```json
{
  "id": "uuid",
  "content": "string - Updated content",
  "status": "published",
  "updatedAt": "2026-02-15T12:30:00.000Z"
}
```

**Errors**

| Status | Description |
|--------|-------------|
| 400 | Invalid status value |
| 404 | Post not found |

**Example**

```bash
curl -X PATCH http://localhost:5010/api/posts/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{"status": "published"}'
```

---

### DELETE /api/posts/:id

Delete a post permanently.

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | uuid | Post ID |

**Response** `204 No Content`

No response body.

**Errors**

| Status | Description |
|--------|-------------|
| 404 | Post not found |

**Example**

```bash
curl -X DELETE http://localhost:5010/api/posts/550e8400-e29b-41d4-a716-446655440000
```

---

## Translation

### POST /api/posts/:id/translate

Translate an existing post to another language while preserving tone and engagement patterns.

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | uuid | Post ID |

**Request Body**

```json
{
  "targetLanguage": "string (required) - 'ar' | 'en'",
  "preserveTone": "boolean (optional) - Maintain original tone. Default: true",
  "adaptCulturally": "boolean (optional) - Adapt cultural references. Default: true"
}
```

**Response** `200 OK`

```json
{
  "id": "uuid - New post ID for the translation",
  "originalPostId": "uuid",
  "content": "string - Translated post content",
  "language": "en",
  "tone": "professional",
  "format": "text",
  "hashtags": ["#AI", "#TechLeadership"],
  "wordCount": 195,
  "status": "draft",
  "createdAt": "2026-02-15T12:00:00.000Z"
}
```

**Errors**

| Status | Description |
|--------|-------------|
| 400 | `targetLanguage` same as post's current language |
| 404 | Post not found |
| 502 | OpenRouter API error |

**Example**

```bash
curl -X POST http://localhost:5010/api/posts/550e8400-e29b-41d4-a716-446655440000/translate \
  -H "Content-Type: application/json" \
  -d '{"targetLanguage": "en", "adaptCulturally": true}'
```

---

## Carousels

### POST /api/posts/:id/carousel

Generate carousel slide content for an existing post.

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | uuid | Post ID |

**Request Body**

```json
{
  "slideCount": "number (optional) - Number of slides (4-12). Default: 8",
  "style": "string (optional) - 'minimal' | 'bold' | 'corporate' | 'creative'. Default: 'minimal'",
  "includeImagePrompts": "boolean (optional) - Generate image prompts for each slide. Default: true"
}
```

**Response** `200 OK`

```json
{
  "id": "uuid - Carousel ID",
  "postId": "uuid",
  "slides": [
    {
      "slideNumber": 1,
      "type": "hook",
      "headline": "string - Main text for the slide",
      "body": "string - Supporting text",
      "speakerNotes": "string - Context for the author",
      "imagePrompt": "string - DALL-E/Midjourney prompt for slide background",
      "layout": "center | left | right | split"
    },
    {
      "slideNumber": 2,
      "type": "content",
      "headline": "1. Evaluate the Model's Strengths",
      "body": "Not all LLMs are created equal...",
      "speakerNotes": "Focus on the evaluation framework",
      "imagePrompt": "Minimalist illustration of a checklist with AI icons...",
      "layout": "left"
    }
  ],
  "style": "minimal",
  "language": "ar",
  "totalSlides": 8,
  "modelUsed": "anthropic/claude-sonnet-4",
  "createdAt": "2026-02-15T12:00:00.000Z"
}
```

**Slide Types**:
- `hook` - First slide, attention-grabbing headline
- `content` - Main content slides
- `data` - Statistics or data visualization slide
- `quote` - Notable quote or callout
- `cta` - Final call-to-action slide

**Errors**

| Status | Description |
|--------|-------------|
| 400 | `slideCount` out of range (4-12) |
| 404 | Post not found |
| 502 | OpenRouter API error |

**Example**

```bash
curl -X POST http://localhost:5010/api/posts/550e8400-e29b-41d4-a716-446655440000/carousel \
  -H "Content-Type: application/json" \
  -d '{"slideCount": 8, "style": "bold", "includeImagePrompts": true}'
```

---

### GET /api/posts/:id/carousel

Get the carousel data for a post.

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | uuid | Post ID |

**Response** `200 OK`

Returns the same carousel structure as the POST endpoint.

**Errors**

| Status | Description |
|--------|-------------|
| 404 | Post or carousel not found |

**Example**

```bash
curl http://localhost:5010/api/posts/550e8400-e29b-41d4-a716-446655440000/carousel
```

---

## Models

### GET /api/models

List available AI models and their capabilities.

**Response** `200 OK`

```json
{
  "models": [
    {
      "id": "anthropic/claude-sonnet-4",
      "name": "Claude Sonnet 4",
      "provider": "Anthropic",
      "capabilities": ["writing", "translation", "analysis"],
      "languages": ["ar", "en"],
      "costPer1kTokens": {
        "input": 0.003,
        "output": 0.015
      },
      "maxContext": 200000,
      "tasks": ["post_generation", "translation", "image_prompts"]
    },
    {
      "id": "google/gemini-2.0-flash",
      "name": "Gemini 2.0 Flash",
      "provider": "Google",
      "capabilities": ["analysis", "summarization"],
      "languages": ["ar", "en"],
      "costPer1kTokens": {
        "input": 0.0001,
        "output": 0.0004
      },
      "maxContext": 1000000,
      "tasks": ["trend_analysis", "data_analysis"]
    },
    {
      "id": "openai/gpt-4o-mini",
      "name": "GPT-4o Mini",
      "provider": "OpenAI",
      "capabilities": ["editing", "formatting"],
      "languages": ["ar", "en"],
      "costPer1kTokens": {
        "input": 0.00015,
        "output": 0.0006
      },
      "maxContext": 128000,
      "tasks": ["quick_edits", "formatting"]
    }
  ]
}
```

**Example**

```bash
curl http://localhost:5010/api/models
```

---

### GET /api/models/usage

Get model usage statistics and cost tracking.

**Query Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| period | string | 7d | Time period: '24h', '7d', '30d', 'all' |

**Response** `200 OK`

```json
{
  "period": "7d",
  "totalRequests": 145,
  "totalTokens": {
    "input": 250000,
    "output": 180000
  },
  "totalCost": 3.45,
  "byModel": [
    {
      "modelId": "anthropic/claude-sonnet-4",
      "requests": 80,
      "tokens": {
        "input": 150000,
        "output": 120000
      },
      "cost": 2.55
    },
    {
      "modelId": "google/gemini-2.0-flash",
      "requests": 45,
      "tokens": {
        "input": 80000,
        "output": 40000
      },
      "cost": 0.024
    },
    {
      "modelId": "openai/gpt-4o-mini",
      "requests": 20,
      "tokens": {
        "input": 20000,
        "output": 20000
      },
      "cost": 0.015
    }
  ],
  "byTask": [
    {
      "task": "post_generation",
      "requests": 60,
      "cost": 1.80
    },
    {
      "task": "trend_analysis",
      "requests": 45,
      "cost": 0.024
    },
    {
      "task": "translation",
      "requests": 20,
      "cost": 0.75
    },
    {
      "task": "quick_edits",
      "requests": 20,
      "cost": 0.015
    }
  ]
}
```

**Example**

```bash
curl "http://localhost:5010/api/models/usage?period=30d"
```

---

## Common Response Patterns

### Error Response

All errors follow this format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable error description",
    "details": {}
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Invalid request body or parameters |
| NOT_FOUND | 404 | Resource not found |
| RATE_LIMITED | 429 | Too many requests |
| AI_ERROR | 502 | OpenRouter / AI model error |
| INTERNAL_ERROR | 500 | Unexpected server error |

### Pagination

All list endpoints return pagination metadata:

```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Rate Limits

| Endpoint | Limit |
|----------|-------|
| POST /api/trends/analyze | 10 per minute |
| POST /api/posts/generate | 20 per hour |
| POST /api/posts/:id/translate | 20 per hour |
| POST /api/posts/:id/carousel | 10 per hour |
| All other endpoints | 100 per minute |
