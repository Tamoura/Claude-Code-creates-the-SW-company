import * as cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { ScraperService } from './service';
import { logger } from '../../utils/logger';

/**
 * Scheduled scraping — runs every 30 minutes by default
 */
export function startScheduler(prisma: PrismaClient, redis: any) {
  const interval = process.env.SCRAPE_INTERVAL || '*/30 * * * *';
  const service = new ScraperService(prisma, redis);

  logger.info(`Starting scraper scheduler with interval: ${interval}`);

  cron.schedule(interval, async () => {
    logger.info('Scheduled scrape starting...');
    try {
      const results = await service.runFullScrape();
      const totalItems = results.reduce((sum, r) => sum + r.items, 0);
      logger.info(`Scheduled scrape complete: ${totalItems} items across ${results.length} platforms`);
    } catch (err) {
      logger.error('Scheduled scrape failed', { error: (err as Error).message });
    }
  });
}
