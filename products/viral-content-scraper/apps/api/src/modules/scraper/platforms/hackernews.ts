import { Platform, MediaType } from '@prisma/client';
import { PlatformScraper, ScrapedContent, extractHashtags, detectCategory } from './base';
import { logger } from '../../../utils/logger';

/**
 * Hacker News Scraper — uses the official HN Firebase API (no auth required)
 * Scrapes top stories
 */
export class HackerNewsScraper implements PlatformScraper {
  platform = Platform.HACKERNEWS;

  isConfigured(): boolean {
    return true; // HN API is public
  }

  async scrape(): Promise<ScrapedContent[]> {
    try {
      const topIds = await this.fetchTopStoryIds();
      const stories = await Promise.all(
        topIds.slice(0, 100).map((id) => this.fetchStory(id)),
      );
      return stories.filter((s): s is ScrapedContent => s !== null);
    } catch (err) {
      logger.error('Failed to scrape Hacker News', { error: (err as Error).message });
      return [];
    }
  }

  private async fetchTopStoryIds(): Promise<number[]> {
    const response = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
    if (!response.ok) throw new Error(`HN API returned ${response.status}`);
    return response.json();
  }

  private async fetchStory(id: number): Promise<ScrapedContent | null> {
    try {
      const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
      if (!response.ok) return null;
      const item = await response.json();
      if (!item || item.type !== 'story' || item.dead || item.deleted) return null;

      const text = (item.title ?? '') + ' ' + (item.text ?? '');
      const hashtags = extractHashtags(text);

      return {
        platform: Platform.HACKERNEWS,
        externalId: String(item.id),
        url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
        title: item.title,
        body: item.text?.slice(0, 2000),
        author: item.by,
        authorFollowers: null,
        likes: item.score ?? 0,
        shares: 0,
        comments: item.descendants ?? 0,
        views: 0,
        saves: 0,
        hashtags,
        category: detectCategory(text, hashtags),
        mediaType: item.url ? MediaType.LINK : MediaType.TEXT,
        publishedAt: new Date(item.time * 1000),
      };
    } catch {
      return null;
    }
  }
}
