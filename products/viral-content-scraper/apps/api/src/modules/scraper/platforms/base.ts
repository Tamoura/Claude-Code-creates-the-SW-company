import { Platform, MediaType } from '@prisma/client';

export interface ScrapedContent {
  platform: Platform;
  externalId: string;
  url: string;
  title?: string;
  body?: string;
  author?: string;
  authorFollowers?: number;
  likes: number;
  shares: number;
  comments: number;
  views: number;
  saves: number;
  hashtags: string[];
  category?: string;
  mediaType: MediaType;
  publishedAt: Date;
}

export interface PlatformScraper {
  platform: Platform;
  scrape(): Promise<ScrapedContent[]>;
  isConfigured(): boolean;
}

/**
 * Extract hashtags from text content
 */
export function extractHashtags(text: string): string[] {
  const matches = text.match(/#[\w\u0600-\u06FF]+/g);
  return matches ? [...new Set(matches.map((h) => h.toLowerCase()))] : [];
}

/**
 * Detect category from content text and hashtags
 */
export function detectCategory(text: string, hashtags: string[]): string {
  const combined = (text + ' ' + hashtags.join(' ')).toLowerCase();

  const categories: Record<string, string[]> = {
    tech: ['ai', 'saas', 'startup', 'coding', 'programming', 'devtools', 'software', 'tech', 'developer', 'api'],
    business: ['business', 'revenue', 'growth', 'marketing', 'sales', 'founder', 'ceo', 'entrepreneur'],
    finance: ['crypto', 'bitcoin', 'trading', 'investing', 'finance', 'stocks', 'defi', 'web3'],
    health: ['health', 'fitness', 'wellness', 'mental', 'nutrition', 'workout'],
    entertainment: ['meme', 'funny', 'comedy', 'gaming', 'music', 'movie'],
    science: ['science', 'research', 'space', 'physics', 'climate', 'biology'],
    politics: ['politics', 'election', 'government', 'policy', 'democrat', 'republican'],
    education: ['learn', 'course', 'tutorial', 'education', 'tips', 'howto'],
  };

  let bestCategory = 'general';
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(categories)) {
    const score = keywords.reduce((acc, kw) => acc + (combined.includes(kw) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestCategory;
}
