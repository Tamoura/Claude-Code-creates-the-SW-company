/**
 * Connection Manager
 * Tracks active WebSocket connections with metadata.
 * Implements heartbeat (ping/pong) and connection cleanup.
 */

import WebSocket from 'ws';
import { logger } from '../../../utils/logger.js';
import { WsServerMessage } from '../schemas.js';

export interface ConnectionMeta {
  userId: string;
  teamId?: string;
  connectedAt: Date;
  lastPongAt: Date;
  rooms: Set<string>;
}

const HEARTBEAT_INTERVAL_MS =
  process.env.NODE_ENV === 'test' ? 60_000 : 30_000;
const TIMEOUT_MS =
  process.env.NODE_ENV === 'test' ? 120_000 : 60_000;
const MAX_QUEUED_EVENTS = 100;

export class ConnectionManager {
  private connections = new Map<WebSocket, ConnectionMeta>();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  /** Start the heartbeat loop. */
  start(): void {
    if (this.heartbeatTimer) return;
    this.heartbeatTimer = setInterval(
      () => this.checkHeartbeats(),
      HEARTBEAT_INTERVAL_MS
    );
    // Allow the process to exit even if the timer is running
    if (this.heartbeatTimer.unref) {
      this.heartbeatTimer.unref();
    }
  }

  /** Stop the heartbeat loop and close all connections. */
  stop(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    for (const [ws] of this.connections) {
      ws.close(1001, 'Server shutting down');
    }
    this.connections.clear();
  }

  /** Register a new authenticated connection. */
  add(ws: WebSocket, userId: string, teamId?: string): void {
    this.connections.set(ws, {
      userId,
      teamId,
      connectedAt: new Date(),
      lastPongAt: new Date(),
      rooms: new Set(),
    });
    logger.debug('Connection added', { userId });
  }

  /** Remove a connection (called on close). */
  remove(ws: WebSocket): ConnectionMeta | undefined {
    const meta = this.connections.get(ws);
    this.connections.delete(ws);
    if (meta) {
      logger.debug('Connection removed', { userId: meta.userId });
    }
    return meta;
  }

  /** Get metadata for a connection. */
  get(ws: WebSocket): ConnectionMeta | undefined {
    return this.connections.get(ws);
  }

  /** Record a pong from the client. */
  recordPong(ws: WebSocket): void {
    const meta = this.connections.get(ws);
    if (meta) {
      meta.lastPongAt = new Date();
    }
  }

  /** Add a room to a connection's subscription list. */
  addRoom(ws: WebSocket, room: string): void {
    const meta = this.connections.get(ws);
    if (meta) {
      meta.rooms.add(room);
    }
  }

  /** Remove a room from a connection's subscription list. */
  removeRoom(ws: WebSocket, room: string): void {
    const meta = this.connections.get(ws);
    if (meta) {
      meta.rooms.delete(room);
    }
  }

  /** Get all connections subscribed to a room. */
  getSubscribers(room: string): WebSocket[] {
    const result: WebSocket[] = [];
    for (const [ws, meta] of this.connections) {
      if (meta.rooms.has(room) && ws.readyState === WebSocket.OPEN) {
        result.push(ws);
      }
    }
    return result;
  }

  /** Total active connections count. */
  get size(): number {
    return this.connections.size;
  }

  /**
   * Send a message to a WebSocket with backpressure check.
   * If the client buffer is full, drop the message.
   */
  send(ws: WebSocket, message: WsServerMessage): boolean {
    if (ws.readyState !== WebSocket.OPEN) return false;

    // Backpressure: check bufferedAmount
    if (ws.bufferedAmount > MAX_QUEUED_EVENTS * 256) {
      logger.warn('Dropping message due to backpressure', {
        buffered: ws.bufferedAmount,
      });
      return false;
    }

    ws.send(JSON.stringify(message));
    return true;
  }

  /** Send pings and close timed-out connections. */
  private checkHeartbeats(): void {
    const now = Date.now();
    for (const [ws, meta] of this.connections) {
      const elapsed = now - meta.lastPongAt.getTime();
      if (elapsed > TIMEOUT_MS) {
        logger.info('Connection timed out', { userId: meta.userId });
        ws.close(4002, 'Connection timed out');
        this.connections.delete(ws);
      } else {
        this.send(ws, { type: 'ping' });
      }
    }
  }
}
