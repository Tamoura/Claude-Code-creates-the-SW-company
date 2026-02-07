/**
 * Event Publisher
 * Publishes activity events to Redis channels for cross-process
 * broadcasting. Falls back to direct local broadcast when Redis
 * is unavailable.
 */

import { FastifyInstance } from 'fastify';
import { ActivityEvent, activityEventSchema } from '../schemas.js';
import { logger } from '../../../utils/logger.js';

/** Module-level reference to the room manager for local fallback. */
let localBroadcastFn: ((room: string, event: ActivityEvent) => void) | null =
  null;

export function setLocalBroadcast(
  fn: (room: string, event: ActivityEvent) => void
): void {
  localBroadcastFn = fn;
}

export class EventPublisher {
  private app: FastifyInstance;

  constructor(app: FastifyInstance) {
    this.app = app;
  }

  /**
   * Publish an event to a room.
   * Uses Redis if available, otherwise broadcasts locally.
   */
  async publish(room: string, event: ActivityEvent): Promise<void> {
    // Validate the event shape
    const parsed = activityEventSchema.safeParse(event);
    if (!parsed.success) {
      logger.warn('Invalid event payload', {
        errors: parsed.error.errors,
      });
      return;
    }

    const validEvent = parsed.data;
    const channel = `ws:${room}`;

    if (this.app.redis) {
      try {
        await this.app.redis.publish(channel, JSON.stringify(validEvent));
        logger.debug('Event published to Redis', { channel, type: event.type });
        return;
      } catch (err) {
        logger.error('Failed to publish to Redis, falling back to local', err);
      }
    }

    // Fallback: local broadcast
    if (localBroadcastFn) {
      localBroadcastFn(room, validEvent);
      logger.debug('Event published locally', { room, type: event.type });
    }
  }
}
