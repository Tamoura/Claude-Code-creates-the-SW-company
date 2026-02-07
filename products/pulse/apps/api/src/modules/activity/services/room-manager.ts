/**
 * Room Manager
 * Tracks which connections are in which rooms.
 * Uses Redis pub/sub when available for cross-process broadcasting.
 * Falls back to in-memory tracking when Redis is unavailable.
 */

import WebSocket from 'ws';
import { FastifyInstance } from 'fastify';
import { ConnectionManager } from './connection-manager.js';
import { WsServerMessage, ActivityEvent } from '../schemas.js';
import { logger } from '../../../utils/logger.js';

export class RoomManager {
  private app: FastifyInstance;
  private connectionManager: ConnectionManager;
  /** In-memory room -> set of ws connections */
  private rooms = new Map<string, Set<WebSocket>>();
  /** Redis subscriber client (separate from main client) */
  private subscriber: ReturnType<typeof this.createSubscriber> | null = null;

  constructor(app: FastifyInstance, connectionManager: ConnectionManager) {
    this.app = app;
    this.connectionManager = connectionManager;
  }

  /** Initialize Redis pub/sub if available. */
  async init(): Promise<void> {
    if (this.app.redis) {
      try {
        this.subscriber = this.createSubscriber();
        logger.info('RoomManager: Redis pub/sub initialized');
      } catch (err) {
        logger.warn('RoomManager: Redis pub/sub failed, using in-memory', {
          error: err instanceof Error ? err.message : 'unknown',
        });
      }
    } else {
      logger.info('RoomManager: Using in-memory room tracking');
    }
  }

  /** Subscribe a connection to a room. */
  async subscribe(ws: WebSocket, room: string): Promise<void> {
    // In-memory tracking
    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }
    this.rooms.get(room)!.add(ws);
    this.connectionManager.addRoom(ws, room);

    // Redis subscription for cross-process
    if (this.subscriber && this.app.redis) {
      const channel = `ws:${room}`;
      await this.subscriber.subscribe(channel);
      logger.debug('Subscribed to Redis channel', { channel });
    }

    logger.debug('Client subscribed to room', { room });
  }

  /** Unsubscribe a connection from a room. */
  async unsubscribe(ws: WebSocket, room: string): Promise<void> {
    const roomSet = this.rooms.get(room);
    if (roomSet) {
      roomSet.delete(ws);
      if (roomSet.size === 0) {
        this.rooms.delete(room);
        // Unsubscribe from Redis channel if no local clients
        if (this.subscriber && this.app.redis) {
          const channel = `ws:${room}`;
          await this.subscriber.unsubscribe(channel);
        }
      }
    }
    this.connectionManager.removeRoom(ws, room);
    logger.debug('Client unsubscribed from room', { room });
  }

  /** Remove a connection from all rooms (on disconnect). */
  async removeFromAllRooms(ws: WebSocket): Promise<void> {
    const meta = this.connectionManager.get(ws);
    if (!meta) return;

    for (const room of meta.rooms) {
      await this.unsubscribe(ws, room);
    }
  }

  /**
   * Broadcast a message to all connections in a room.
   * Called locally (from Redis message handler or direct publish).
   */
  broadcastToRoom(room: string, event: ActivityEvent): void {
    const roomSet = this.rooms.get(room);
    if (!roomSet || roomSet.size === 0) return;

    const message: WsServerMessage = {
      type: 'event',
      room,
      event,
    };

    for (const ws of roomSet) {
      this.connectionManager.send(ws, message);
    }
  }

  /** Shut down Redis subscriber. */
  async shutdown(): Promise<void> {
    if (this.subscriber) {
      try {
        await this.subscriber.quit();
      } catch {
        // ignore
      }
      this.subscriber = null;
    }
    this.rooms.clear();
  }

  /** Get number of subscribers in a room. */
  getRoomSize(room: string): number {
    return this.rooms.get(room)?.size ?? 0;
  }

  /** Create a duplicate Redis client for subscriptions. */
  private createSubscriber() {
    if (!this.app.redis) return null;
    const sub = this.app.redis.duplicate();

    sub.on('message', (channel: string, message: string) => {
      // channel format: ws:team:123 or ws:repo:456
      // room format: team:123 or repo:456
      const room = channel.replace(/^ws:/, '');
      try {
        const event = JSON.parse(message) as ActivityEvent;
        this.broadcastToRoom(room, event);
      } catch (err) {
        logger.error('Failed to parse Redis pub/sub message', err);
      }
    });

    return sub;
  }
}
