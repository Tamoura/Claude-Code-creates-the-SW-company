import { PrismaClient } from '@prisma/client';
import { OpenRouterClient } from './openrouter';
import { BadRequestError } from '../../lib/errors';

const PROFILE_OPTIMIZER_SYSTEM = `You are a professional profile optimization expert specializing in
Arabic and English professional content for the MENA tech industry.

Your task is to analyze a user's professional profile and provide:
1. A completeness score (0-100) based on weighted sections
2. Specific, actionable recommendations for improvement
3. Suggested headline and summary text in BOTH Arabic and English

Rules:
- Generate Arabic content that sounds natural, not translated
- Use Modern Standard Arabic (فصحى) for professional contexts
- Keep headlines under 220 characters
- Keep summaries under 2000 characters
- Focus recommendations on discoverability and professionalism
- Never fabricate experience or skills the user has not listed

Respond in JSON format with this exact structure:
{
  "completenessScore": <number 0-100>,
  "recommendations": [
    { "section": "<section>", "priority": "high|medium|low", "suggestion": "<text>" }
  ],
  "suggestedHeadlineAr": "<arabic headline>",
  "suggestedHeadlineEn": "<english headline>",
  "suggestedSummaryAr": "<arabic summary>",
  "suggestedSummaryEn": "<english summary>"
}`;

export interface ProfileOptimizerResult {
  completenessScore: number;
  recommendations: Array<{
    section: string;
    priority: 'high' | 'medium' | 'low';
    suggestion: string;
  }>;
  suggestedHeadlineAr: string;
  suggestedHeadlineEn: string;
  suggestedSummaryAr: string;
  suggestedSummaryEn: string;
  cached: boolean;
  tokensUsed?: number;
}

/** Simple in-memory cache for AI responses. */
const responseCache = new Map<
  string,
  { result: ProfileOptimizerResult; expiresAt: number }
>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/** Per-user daily rate limiting (in-memory). */
const userDailyUsage = new Map<string, { count: number; resetsAt: number }>();
const MAX_DAILY_OPTIMIZATIONS = 5;

function hashProfileData(data: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(data).digest('hex').slice(0, 16);
}

function checkRateLimit(userId: string): void {
  const now = Date.now();
  const usage = userDailyUsage.get(userId);

  if (!usage || now > usage.resetsAt) {
    userDailyUsage.set(userId, {
      count: 1,
      resetsAt: now + 24 * 60 * 60 * 1000,
    });
    return;
  }

  if (usage.count >= MAX_DAILY_OPTIMIZATIONS) {
    throw new BadRequestError(
      `Daily limit of ${MAX_DAILY_OPTIMIZATIONS} profile optimizations reached. Try again tomorrow.`
    );
  }

  usage.count++;
}

export class AIService {
  private readonly client: OpenRouterClient | null;

  constructor(
    private readonly prisma: PrismaClient,
    apiKey?: string
  ) {
    if (apiKey) {
      this.client = new OpenRouterClient({ apiKey });
    } else {
      this.client = null;
    }
  }

  get isAvailable(): boolean {
    return this.client !== null;
  }

  async optimizeProfile(userId: string): Promise<ProfileOptimizerResult> {
    if (!this.client) {
      throw new BadRequestError(
        'AI features are temporarily unavailable. Your profile is fully functional without AI.'
      );
    }

    checkRateLimit(userId);

    // Fetch profile data
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: {
        experiences: { orderBy: { startDate: 'desc' }, take: 10 },
        educations: { orderBy: { startYear: 'desc' }, take: 5 },
        profileSkills: { include: { skill: true }, take: 20 },
        user: { select: { displayName: true } },
      },
    });

    if (!profile) {
      throw new BadRequestError('Profile not found');
    }

    // Build profile summary for the prompt
    const profileText = JSON.stringify({
      displayName: profile.user.displayName,
      headlineAr: profile.headlineAr || 'Not set',
      headlineEn: profile.headlineEn || 'Not set',
      summaryAr: profile.summaryAr || 'Not set',
      summaryEn: profile.summaryEn || 'Not set',
      location: profile.location || 'Not set',
      experiences: profile.experiences.map((e) => ({
        title: e.title,
        company: e.company,
        current: e.isCurrent,
      })),
      educations: profile.educations.map((e) => ({
        institution: e.institution,
        degree: e.degree,
        field: e.fieldOfStudy,
      })),
      skills: profile.profileSkills.map((ps) => ps.skill.nameEn),
    });

    // Check cache
    const cacheKey = hashProfileData(profileText);
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return { ...cached.result, cached: true };
    }

    // Call OpenRouter
    const response = await this.client.chat([
      { role: 'system', content: PROFILE_OPTIMIZER_SYSTEM },
      {
        role: 'user',
        content: `Analyze this professional profile and provide optimization suggestions:\n\n${profileText}\n\nProvide your response as JSON.`,
      },
    ]);

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new BadRequestError(
        'AI returned an empty response. Please try again.'
      );
    }

    // Parse JSON from response (handle markdown code blocks)
    let parsed: ProfileOptimizerResult;
    try {
      const jsonStr = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      throw new BadRequestError(
        'AI returned invalid format. Please try again.'
      );
    }

    const result: ProfileOptimizerResult = {
      completenessScore: parsed.completenessScore ?? 0,
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations
        : [],
      suggestedHeadlineAr: parsed.suggestedHeadlineAr ?? '',
      suggestedHeadlineEn: parsed.suggestedHeadlineEn ?? '',
      suggestedSummaryAr: parsed.suggestedSummaryAr ?? '',
      suggestedSummaryEn: parsed.suggestedSummaryEn ?? '',
      cached: false,
      tokensUsed: response.usage?.total_tokens,
    };

    // Cache result
    responseCache.set(cacheKey, {
      result,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return result;
  }

  async getAIStatus() {
    return {
      available: this.isAvailable,
      features: {
        profileOptimizer: this.isAvailable,
        contentAssistant: false, // Phase 2
        connectionSuggestions: false, // Phase 2
        jobMatching: false, // Phase 2
      },
    };
  }

  // Exported for testing
  static _resetCache(): void {
    responseCache.clear();
    userDailyUsage.clear();
  }
}
