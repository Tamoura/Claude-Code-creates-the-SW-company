import Redis from 'ioredis';
import { format } from 'date-fns';

export async function updateRealtimeCounters(
  redis: Redis | null,
  tenantId: string,
  eventType: string
): Promise<void> {
  if (!redis) return;

  const today = format(new Date(), 'yyyy-MM-dd');
  const counterKey = `reco:counter:${tenantId}:${today}`;

  const pipeline = redis.pipeline();

  // Increment total events
  pipeline.hincrby(counterKey, 'total_events', 1);

  // Increment specific event type
  pipeline.hincrby(counterKey, eventType, 1);

  // Map event types to analytics metrics
  if (eventType === 'recommendation_impressed') {
    pipeline.hincrby(counterKey, 'impressions', 1);
  } else if (eventType === 'recommendation_clicked') {
    pipeline.hincrby(counterKey, 'clicks', 1);
  } else if (eventType === 'purchase') {
    pipeline.hincrby(counterKey, 'conversions', 1);
  }

  // Set TTL to 48 hours
  pipeline.expire(counterKey, 48 * 60 * 60);

  await pipeline.exec();
}

export async function getRealtimeCounters(
  redis: Redis | null,
  tenantId: string,
  date: string
): Promise<Record<string, number>> {
  if (!redis) return {};

  const counterKey = `reco:counter:${tenantId}:${date}`;
  const data = await redis.hgetall(counterKey);

  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(data)) {
    result[key] = parseInt(value, 10);
  }
  return result;
}
