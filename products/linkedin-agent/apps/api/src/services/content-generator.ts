import { callLLM, selectModel, LLMResponse } from './openrouter';
import { logger } from '../utils/logger';

export interface TrendAnalysis {
  topics: Array<{
    title: string;
    description: string;
    relevance: number; // 0-100
    suggestedAngle: string;
  }>;
  overallTheme: string;
  recommendedTags: string[];
}

export interface PostDraftResult {
  title: string;
  content: string;
  contentAr: string | null;
  contentEn: string | null;
  tags: string[];
  tone: string;
  targetAudience: string;
  llmResponse: LLMResponse;
}

export interface FormatRecommendation {
  recommendedFormat: 'text' | 'carousel' | 'infographic' | 'link' | 'poll' | 'video';
  reason: string;
  alternativeFormats: Array<{
    format: string;
    reason: string;
  }>;
  llmResponse: LLMResponse;
}

export interface CarouselSlideResult {
  slideNumber: number;
  headline: string;
  body: string;
  imagePrompt: string;
}

/**
 * Analyze pasted content for trending topics and angles.
 */
export async function analyzeTrends(content: string): Promise<{
  analysis: TrendAnalysis;
  llmResponse: LLMResponse;
}> {
  const model = selectModel('analysis');

  const llmResponse = await callLLM({
    model,
    messages: [
      {
        role: 'system',
        content: `You are a LinkedIn content strategist specializing in AI and technology trends.
Analyze the provided content and identify trending topics suitable for LinkedIn posts.

Respond in valid JSON with this structure:
{
  "topics": [
    {
      "title": "Topic title",
      "description": "Brief description",
      "relevance": 85,
      "suggestedAngle": "A unique angle for a LinkedIn post"
    }
  ],
  "overallTheme": "The overarching theme",
  "recommendedTags": ["#tag1", "#tag2"]
}

Focus on AI, technology, and professional development angles.
Provide 2-5 topics with relevance scores (0-100).`,
      },
      {
        role: 'user',
        content: `Analyze this content for LinkedIn post opportunities:\n\n${content}`,
      },
    ],
    temperature: 0.5,
    maxTokens: 1500,
  });

  let analysis: TrendAnalysis;
  try {
    analysis = JSON.parse(llmResponse.content);
  } catch {
    logger.warn('Failed to parse trend analysis JSON, using fallback');
    analysis = {
      topics: [{
        title: 'Content Analysis',
        description: llmResponse.content.substring(0, 200),
        relevance: 70,
        suggestedAngle: 'Share insights from this content',
      }],
      overallTheme: 'Technology Trends',
      recommendedTags: ['#AI', '#Technology', '#LinkedIn'],
    };
  }

  return { analysis, llmResponse };
}

/**
 * Generate a LinkedIn post for a given topic.
 */
export async function generatePost(params: {
  topic: string;
  language: 'ar' | 'en' | 'both';
  tone: string;
  audience: string;
}): Promise<PostDraftResult> {
  const { topic, language, tone, audience } = params;
  const model = selectModel('writing');

  const languageInstructions = language === 'ar'
    ? 'Write the post in Arabic only. The Arabic content should be professional and engaging.'
    : language === 'en'
      ? 'Write the post in English only.'
      : 'Write the post in both Arabic and English. Provide both versions.';

  const llmResponse = await callLLM({
    model,
    messages: [
      {
        role: 'system',
        content: `You are a professional LinkedIn content writer.
Create engaging LinkedIn posts that drive engagement and thought leadership.

${languageInstructions}

Respond in valid JSON with this structure:
{
  "title": "Post title/hook",
  "content": "The main post content (primary language)",
  "contentAr": "Arabic version (null if not requested)",
  "contentEn": "English version (null if not requested)",
  "tags": ["#tag1", "#tag2"],
  "suggestedHashtags": ["#hashtag1", "#hashtag2"]
}

Guidelines:
- Start with a strong hook (first 2 lines are crucial)
- Use line breaks for readability
- Include a call-to-action
- Keep it under 3000 characters
- Use relevant emoji sparingly
- Target tone: ${tone}
- Target audience: ${audience}`,
      },
      {
        role: 'user',
        content: `Write a LinkedIn post about: ${topic}`,
      },
    ],
    temperature: 0.8,
    maxTokens: 2000,
  });

  let parsed: {
    title: string;
    content: string;
    contentAr: string | null;
    contentEn: string | null;
    tags: string[];
  };

  try {
    parsed = JSON.parse(llmResponse.content);
  } catch {
    logger.warn('Failed to parse post generation JSON, using raw content');
    parsed = {
      title: topic,
      content: llmResponse.content,
      contentAr: language === 'ar' || language === 'both' ? llmResponse.content : null,
      contentEn: language === 'en' || language === 'both' ? llmResponse.content : null,
      tags: ['#LinkedIn', '#AI'],
    };
  }

  return {
    title: parsed.title || topic,
    content: parsed.content || llmResponse.content,
    contentAr: parsed.contentAr || null,
    contentEn: parsed.contentEn || null,
    tags: parsed.tags || [],
    tone,
    targetAudience: audience,
    llmResponse,
  };
}

/**
 * Recommend the best format for a LinkedIn post.
 */
export async function recommendFormat(
  topic: string,
  content: string
): Promise<FormatRecommendation> {
  const model = selectModel('analysis');

  const llmResponse = await callLLM({
    model,
    messages: [
      {
        role: 'system',
        content: `You are a LinkedIn content strategist.
Analyze the topic and content, then recommend the best post format.

Available formats: text, carousel, infographic, link, poll, video

Respond in valid JSON:
{
  "recommendedFormat": "carousel",
  "reason": "Why this format works best",
  "alternativeFormats": [
    { "format": "text", "reason": "Why this could also work" }
  ]
}

Consider:
- Carousel: best for step-by-step, lists, tutorials (5-10 slides)
- Text: best for stories, opinions, short insights
- Infographic: best for data-heavy, statistics, comparisons
- Link: best for sharing articles with commentary
- Poll: best for audience engagement, simple questions
- Video: best for demos, personal stories, explanations`,
      },
      {
        role: 'user',
        content: `Topic: ${topic}\n\nContent preview: ${content.substring(0, 500)}`,
      },
    ],
    temperature: 0.4,
    maxTokens: 800,
  });

  let recommendation: Omit<FormatRecommendation, 'llmResponse'>;

  try {
    recommendation = JSON.parse(llmResponse.content);
  } catch {
    logger.warn('Failed to parse format recommendation JSON');
    recommendation = {
      recommendedFormat: 'text',
      reason: 'Default recommendation: text posts are versatile.',
      alternativeFormats: [
        { format: 'carousel', reason: 'Could work if content has multiple points.' },
      ],
    };
  }

  return {
    ...recommendation,
    llmResponse,
  };
}

/**
 * Generate carousel slides with image prompts for a post.
 */
export async function generateCarouselSlides(
  postTitle: string,
  postContent: string,
  slideCount: number
): Promise<{
  slides: CarouselSlideResult[];
  llmResponse: LLMResponse;
}> {
  const model = selectModel('writing');

  const llmResponse = await callLLM({
    model,
    messages: [
      {
        role: 'system',
        content: `You are a LinkedIn carousel content designer.
Create ${slideCount} carousel slides based on the post content.

Respond in valid JSON:
{
  "slides": [
    {
      "slideNumber": 1,
      "headline": "Slide headline (short, punchy)",
      "body": "Slide body text (2-3 sentences max)",
      "imagePrompt": "Detailed prompt for AI image generation"
    }
  ]
}

Guidelines:
- Slide 1: Hook/title slide (grab attention)
- Middle slides: Key points (one idea per slide)
- Last slide: CTA / summary / follow prompt
- Image prompts: professional, clean, LinkedIn-appropriate style
- Keep text concise - carousels need to be scannable`,
      },
      {
        role: 'user',
        content: `Create ${slideCount} carousel slides for:\nTitle: ${postTitle}\nContent: ${postContent}`,
      },
    ],
    temperature: 0.7,
    maxTokens: 2000,
  });

  let parsed: { slides: CarouselSlideResult[] };

  try {
    parsed = JSON.parse(llmResponse.content);
  } catch {
    logger.warn('Failed to parse carousel slides JSON');
    parsed = {
      slides: [{
        slideNumber: 1,
        headline: postTitle,
        body: postContent.substring(0, 200),
        imagePrompt: `Professional LinkedIn carousel slide about ${postTitle}`,
      }],
    };
  }

  return { slides: parsed.slides, llmResponse };
}

/**
 * Translate post content between Arabic and English.
 */
export async function translatePost(
  content: string,
  from: 'ar' | 'en',
  to: 'ar' | 'en'
): Promise<{
  translatedContent: string;
  llmResponse: LLMResponse;
}> {
  const model = selectModel('translation');

  const fromLang = from === 'ar' ? 'Arabic' : 'English';
  const toLang = to === 'ar' ? 'Arabic' : 'English';

  const llmResponse = await callLLM({
    model,
    messages: [
      {
        role: 'system',
        content: `You are a professional translator specializing in LinkedIn content.
Translate the following ${fromLang} LinkedIn post to ${toLang}.

Guidelines:
- Maintain the professional tone
- Adapt idioms and expressions naturally
- Keep LinkedIn-specific terminology
- Preserve formatting (line breaks, bullet points, emojis)
- For Arabic: use Modern Standard Arabic with professional vocabulary
- Do NOT add any explanation, just provide the translation`,
      },
      {
        role: 'user',
        content,
      },
    ],
    temperature: 0.3,
    maxTokens: 2000,
  });

  return {
    translatedContent: llmResponse.content,
    llmResponse,
  };
}
