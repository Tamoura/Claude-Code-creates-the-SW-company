import { PrismaClient, Platform } from '@prisma/client';
import { PlatformScraper, ScrapedContent } from './platforms/base';
import { RedditScraper } from './platforms/reddit';
import { HackerNewsScraper } from './platforms/hackernews';
import { calculateViralityScore, calculatePercentile } from './scoring';
import { logger } from '../../utils/logger';
import Redis from 'ioredis';

export class ScraperService {
  private scrapers: PlatformScraper[];

  constructor(
    private prisma: PrismaClient,
    private redis: Redis | null,
  ) {
    this.scrapers = [
      new RedditScraper(),
      new HackerNewsScraper(),
    ].filter((s) => s.isConfigured());
  }

  /**
   * Run a full scrape cycle across all configured platforms
   */
  async runFullScrape(): Promise<{ platform: string; items: number; errors: string[] }[]> {
    const results: { platform: string; items: number; errors: string[] }[] = [];

    for (const scraper of this.scrapers) {
      const job = await this.prisma.scrapeJob.create({
        data: { platform: scraper.platform, status: 'RUNNING', startedAt: new Date() },
      });

      try {
        const content = await scraper.scrape();
        const saved = await this.processContent(content);

        await this.prisma.scrapeJob.update({
          where: { id: job.id },
          data: { status: 'COMPLETED', itemsFound: saved, finishedAt: new Date() },
        });

        results.push({ platform: scraper.platform, items: saved, errors: [] });
        logger.info(`Scraped ${saved} items from ${scraper.platform}`);
      } catch (err) {
        const errorMsg = (err as Error).message;
        await this.prisma.scrapeJob.update({
          where: { id: job.id },
          data: { status: 'FAILED', errors: [errorMsg], finishedAt: new Date() },
        });
        results.push({ platform: scraper.platform, items: 0, errors: [errorMsg] });
        logger.error(`Scrape failed for ${scraper.platform}`, { error: errorMsg });
      }
    }

    // After scraping, recalculate percentiles
    await this.recalculatePercentiles();
    // Invalidate cache
    if (this.redis) {
      const keys = await this.redis.keys('vcs:content:*');
      if (keys.length > 0) await this.redis.del(...keys);
    }

    return results;
  }

  /**
   * Process scraped content: upsert, score, and store
   */
  private async processContent(items: ScrapedContent[]): Promise<number> {
    let saved = 0;

    for (const item of items) {
      try {
        // Get previous snapshot for velocity calculation
        const existing = await this.prisma.content.findUnique({
          where: { platform_externalId: { platform: item.platform, externalId: item.externalId } },
        });

        const scores = calculateViralityScore(
          {
            likes: item.likes,
            shares: item.shares,
            comments: item.comments,
            views: item.views,
            saves: item.saves,
            authorFollowers: item.authorFollowers ?? null,
            publishedAt: item.publishedAt,
          },
          item.platform,
          existing
            ? {
                current: { likes: item.likes, shares: item.shares, comments: item.comments, views: item.views },
                previous: { likes: existing.likes, shares: existing.shares, comments: existing.comments, views: existing.views },
                hoursBetween: (Date.now() - existing.updatedAt.getTime()) / (1000 * 60 * 60),
              }
            : null,
        );

        const content = await this.prisma.content.upsert({
          where: { platform_externalId: { platform: item.platform, externalId: item.externalId } },
          create: {
            platform: item.platform,
            externalId: item.externalId,
            url: item.url,
            title: item.title,
            body: item.body,
            author: item.author,
            authorFollowers: item.authorFollowers,
            likes: item.likes,
            shares: item.shares,
            comments: item.comments,
            views: item.views,
            saves: item.saves,
            viralityScore: scores.viralityScore,
            engagementRate: scores.engagementRate,
            velocityScore: scores.velocityScore,
            hashtags: item.hashtags,
            category: item.category,
            mediaType: item.mediaType,
            publishedAt: item.publishedAt,
          },
          update: {
            likes: item.likes,
            shares: item.shares,
            comments: item.comments,
            views: item.views,
            saves: item.saves,
            viralityScore: scores.viralityScore,
            engagementRate: scores.engagementRate,
            velocityScore: scores.velocityScore,
            hashtags: item.hashtags,
            category: item.category,
          },
        });

        // Store engagement snapshot for velocity tracking
        await this.prisma.contentSnapshot.create({
          data: {
            contentId: content.id,
            likes: item.likes,
            shares: item.shares,
            comments: item.comments,
            views: item.views,
          },
        });

        saved++;
      } catch (err) {
        logger.warn(`Failed to process content ${item.externalId}`, { error: (err as Error).message });
      }
    }

    return saved;
  }

  /**
   * Recalculate percentile rankings across all content
   */
  private async recalculatePercentiles(): Promise<void> {
    const platforms = await this.prisma.content.groupBy({
      by: ['platform'],
    });

    for (const { platform } of platforms) {
      const allContent = await this.prisma.content.findMany({
        where: { platform },
        select: { id: true, viralityScore: true },
        orderBy: { viralityScore: 'asc' },
      });

      const scores = allContent.map((c) => c.viralityScore);

      // Batch update percentiles
      for (let i = 0; i < allContent.length; i++) {
        const percentile = calculatePercentile(allContent[i].viralityScore, scores);
        await this.prisma.content.update({
          where: { id: allContent[i].id },
          data: { percentile },
        });
      }
    }
  }

  /**
   * Get scrape job history
   */
  async getJobs(limit = 20) {
    return this.prisma.scrapeJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
