import { Platform, MediaType } from '@prisma/client';
import { PlatformScraper, ScrapedContent, extractHashtags, detectCategory } from './base';
import { logger } from '../../../utils/logger';

/**
 * Reddit Scraper — uses Reddit's public JSON API (no auth required for public data)
 * Scrapes top/hot posts from popular subreddits
 */
export class RedditScraper implements PlatformScraper {
  platform = Platform.REDDIT;

  private subreddits = [
    'all', 'popular', 'technology', 'programming', 'startups',
    'entrepreneur', 'SaaS', 'artificial', 'MachineLearning',
    'dataisbeautiful', 'business', 'marketing', 'webdev',
    'sideproject', 'indiehackers',
  ];

  isConfigured(): boolean {
    return true; // Reddit public JSON API requires no credentials
  }

  async scrape(): Promise<ScrapedContent[]> {
    const results: ScrapedContent[] = [];

    for (const subreddit of this.subreddits) {
      try {
        const posts = await this.fetchSubreddit(subreddit);
        results.push(...posts);
      } catch (err) {
        logger.warn(`Failed to scrape r/${subreddit}`, { error: (err as Error).message });
      }
    }

    return results;
  }

  private async fetchSubreddit(subreddit: string): Promise<ScrapedContent[]> {
    const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=50`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'ViralContentScraper/1.0' },
    });

    if (!response.ok) {
      throw new Error(`Reddit API returned ${response.status}`);
    }

    const data = await response.json();
    const posts = data?.data?.children ?? [];

    return posts
      .filter((p: any) => p.data && !p.data.stickied)
      .map((p: any) => this.mapPost(p.data))
      .filter((p: ScrapedContent) => p.likes + p.comments > 50); // Filter low-engagement
  }

  private mapPost(post: any): ScrapedContent {
    const text = (post.title ?? '') + ' ' + (post.selftext ?? '');
    const hashtags = extractHashtags(text);

    return {
      platform: Platform.REDDIT,
      externalId: post.id,
      url: `https://reddit.com${post.permalink}`,
      title: post.title,
      body: post.selftext?.slice(0, 2000),
      author: post.author,
      authorFollowers: null,
      likes: Math.max(0, post.ups ?? 0),
      shares: 0, // Reddit doesn't expose share count
      comments: post.num_comments ?? 0,
      views: 0, // Reddit doesn't expose view count on public API
      saves: 0,
      hashtags,
      category: detectCategory(text, hashtags),
      mediaType: this.detectMediaType(post),
      publishedAt: new Date(post.created_utc * 1000),
    };
  }

  private detectMediaType(post: any): MediaType {
    if (post.is_video) return MediaType.VIDEO;
    if (post.post_hint === 'image') return MediaType.IMAGE;
    if (post.post_hint === 'link') return MediaType.LINK;
    if (post.is_gallery) return MediaType.CAROUSEL;
    if (post.poll_data) return MediaType.POLL;
    return MediaType.TEXT;
  }
}
