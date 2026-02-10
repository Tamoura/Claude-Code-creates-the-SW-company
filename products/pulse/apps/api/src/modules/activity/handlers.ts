/**
 * Activity module handlers.
 * WebSocket handler for real-time streaming and REST handler
 * for paginated activity feed.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { WebSocket } from 'ws';
import { ConnectionManager } from './services/connection-manager.js';
import { RoomManager } from './services/room-manager.js';
import { setLocalBroadcast } from './services/event-publisher.js';
import {
  wsClientMessageSchema,
  activityFeedQuerySchema,
  ActivityEvent,
} from './schemas.js';
import { logger } from '../../utils/logger.js';

// Singleton instances shared across the module
let connectionManager: ConnectionManager;
let roomManager: RoomManager;

export function getConnectionManager(): ConnectionManager {
  return connectionManager;
}

export function getRoomManager(): RoomManager {
  return roomManager;
}

/**
 * Initialize activity module services.
 * Called once during app registration.
 */
export async function initActivityServices(
  app: FastifyInstance
): Promise<void> {
  connectionManager = new ConnectionManager();
  roomManager = new RoomManager(app, connectionManager);

  await roomManager.init();
  connectionManager.start();

  // Wire up local broadcast fallback
  setLocalBroadcast((room: string, event: ActivityEvent) => {
    roomManager.broadcastToRoom(room, event);
  });

  // Clean up on app close
  app.addHook('onClose', async () => {
    connectionManager.stop();
    await roomManager.shutdown();
  });
}

/**
 * WebSocket connection handler.
 * Authenticates via query param token or first message.
 */
export function handleWebSocketConnection(
  app: FastifyInstance,
  socket: WebSocket,
  request: FastifyRequest
): void {
  const query = request.query as { token?: string };
  let authenticated = false;

  // Set up message handler first (per @fastify/websocket docs)
  // to avoid dropping messages
  const pendingMessages: string[] = [];

  socket.on('message', (data) => {
    const raw = data.toString();
    if (!authenticated) {
      // Handle auth message
      try {
        const msg = JSON.parse(raw);
        if (msg.type === 'auth' && msg.token) {
          clearTimeout(authTimeout);
          authenticateToken(app, socket, msg.token);
        } else {
          sendError(socket, 'Expected auth message');
          socket.close(4001, 'Expected auth message');
          clearTimeout(authTimeout);
        }
      } catch {
        sendError(socket, 'Invalid JSON');
        socket.close(4001, 'Invalid JSON');
        clearTimeout(authTimeout);
      }
    } else {
      // Handle regular messages
      handleAuthenticatedMessage(app, socket, raw);
    }
  });

  socket.on('close', async () => {
    if (authenticated) {
      await roomManager.removeFromAllRooms(socket);
      connectionManager.remove(socket);
    }
  });

  socket.on('error', (err) => {
    logger.error('WebSocket error', err);
  });

  // Attempt auth from query param
  if (query.token) {
    authenticateToken(app, socket, query.token);
    return;
  }

  // Wait for auth message (with 10s timeout)
  const authTimeout = setTimeout(() => {
    if (!authenticated) {
      sendError(socket, 'Authentication timeout');
      socket.close(4001, 'Authentication timeout');
    }
  }, 10_000);

  function authenticateToken(
    fastify: FastifyInstance,
    ws: WebSocket,
    token: string
  ): void {
    try {
      const decoded = fastify.jwt.verify<{
        sub: string;
        email: string;
        name: string;
      }>(token);

      authenticated = true;
      connectionManager.add(ws, decoded.sub);

      // Send authenticated confirmation
      connectionManager.send(ws, {
        type: 'authenticated',
        userId: decoded.sub,
      });

      logger.debug('WebSocket authenticated', { userId: decoded.sub });
    } catch (err) {
      logger.warn('WebSocket auth failed', {
        error: err instanceof Error ? err.message : 'unknown',
      });
      sendError(ws, 'Invalid or expired token');
      ws.close(4001, 'Invalid or expired token');
    }
  }
}

/**
 * Handle a message from an authenticated WebSocket connection.
 */
async function handleAuthenticatedMessage(
  app: FastifyInstance,
  ws: WebSocket,
  raw: string
): Promise<void> {
  try {
    const data = JSON.parse(raw);
    const parsed = wsClientMessageSchema.safeParse(data);

    if (!parsed.success) {
      sendError(ws, 'Invalid message format');
      return;
    }

    const msg = parsed.data;

    switch (msg.type) {
      case 'subscribe':
        await roomManager.subscribe(ws, msg.room);
        connectionManager.send(ws, {
          type: 'subscribed',
          room: msg.room,
        });
        break;

      case 'unsubscribe':
        await roomManager.unsubscribe(ws, msg.room);
        connectionManager.send(ws, {
          type: 'unsubscribed',
          room: msg.room,
        });
        break;

      case 'pong':
        connectionManager.recordPong(ws);
        break;

      case 'auth':
        sendError(ws, 'Already authenticated');
        break;

      default:
        sendError(ws, 'Unknown message type');
    }
  } catch (err) {
    logger.error('Error handling WebSocket message', err);
    sendError(ws, 'Internal error');
  }
}

/** Send a JSON error message to a WebSocket. */
function sendError(ws: WebSocket, message: string, code?: string): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'error', message, code }));
  }
}

/**
 * REST handler: GET /api/v1/activity
 * Returns paginated activity feed from the database.
 */
export async function handleActivityFeed(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const parsed = activityFeedQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    reply.code(422).send({
      type: 'https://pulse.dev/errors/validation-error',
      title: 'Validation Error',
      status: 422,
      detail: 'Invalid query parameters',
      errors: parsed.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  const { cursor, limit, repoId, teamId, eventType, since, until } =
    parsed.data;
  const app = request.server;

  // Decode cursor: it's the ISO timestamp of the last item seen.
  // Items with timestamps strictly before the cursor are on the
  // next page.
  const cursorDate = cursor ? new Date(cursor) : undefined;

  // Build activity items from multiple sources
  const items: ActivityEvent[] = [];

  // Build date filter from explicit since/until params
  const buildDateFilter = () => {
    const filter: Record<string, Date> = {};
    if (since) filter.gte = new Date(since);
    if (until) filter.lte = new Date(until);
    // Cursor overrides the upper bound
    if (cursorDate) filter.lt = cursorDate;
    return Object.keys(filter).length > 0 ? filter : undefined;
  };

  // Determine repo filter
  let repoIds: string[] | undefined;
  if (repoId) {
    repoIds = [repoId];
  } else if (teamId) {
    const repos = await app.prisma.repository.findMany({
      where: { teamId },
      select: { id: true },
    });
    repoIds = repos.map((r) => r.id);
  }

  const take = limit + 1;
  const commitDateFilter = buildDateFilter();
  const prDateFilter = buildDateFilter();
  const reviewDateFilter = buildDateFilter();
  const deployDateFilter = buildDateFilter();

  if (!eventType || eventType === 'commit') {
    const commits = await app.prisma.commit.findMany({
      where: {
        ...(repoIds ? { repoId: { in: repoIds } } : {}),
        ...(commitDateFilter ? { committedAt: commitDateFilter } : {}),
      },
      orderBy: { committedAt: 'desc' },
      take,
      include: { repository: { select: { fullName: true } } },
    });

    for (const c of commits) {
      items.push({
        type: 'commit',
        repo: c.repository.fullName,
        author: c.authorGithubUsername || c.authorEmail || 'unknown',
        timestamp: c.committedAt.toISOString(),
        summary: c.message,
        metadata: { id: c.id, sha: c.sha },
      });
    }
  }

  if (!eventType || eventType === 'pull_request') {
    const prs = await app.prisma.pullRequest.findMany({
      where: {
        ...(repoIds ? { repoId: { in: repoIds } } : {}),
        ...(prDateFilter ? { createdAt: prDateFilter } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take,
      include: { repository: { select: { fullName: true } } },
    });

    for (const pr of prs) {
      items.push({
        type: 'pull_request',
        repo: pr.repository.fullName,
        author: pr.authorGithubUsername || 'unknown',
        timestamp: pr.createdAt.toISOString(),
        summary: `#${pr.number} ${pr.title}`,
        metadata: { id: pr.id, number: pr.number, state: pr.state },
      });
    }
  }

  if (!eventType || eventType === 'review') {
    const reviews = await app.prisma.review.findMany({
      where: {
        ...(repoIds
          ? { pullRequest: { repoId: { in: repoIds } } }
          : {}),
        ...(reviewDateFilter ? { submittedAt: reviewDateFilter } : {}),
      },
      orderBy: { submittedAt: 'desc' },
      take,
      include: {
        pullRequest: {
          select: {
            number: true,
            title: true,
            repository: { select: { fullName: true } },
          },
        },
      },
    });

    for (const r of reviews) {
      items.push({
        type: 'review',
        repo: r.pullRequest.repository.fullName,
        author: r.reviewerGithubUsername,
        timestamp: r.submittedAt.toISOString(),
        summary: `${r.state} review on #${r.pullRequest.number}`,
        metadata: { id: r.id, state: r.state },
      });
    }
  }

  if (!eventType || eventType === 'deployment') {
    const deployments = await app.prisma.deployment.findMany({
      where: {
        ...(repoIds ? { repoId: { in: repoIds } } : {}),
        ...(deployDateFilter ? { createdAt: deployDateFilter } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take,
      include: { repository: { select: { fullName: true } } },
    });

    for (const d of deployments) {
      items.push({
        type: 'deployment',
        repo: d.repository.fullName,
        author: 'system',
        timestamp: d.createdAt.toISOString(),
        summary: `${d.environment} deployment: ${d.status}`,
        metadata: { id: d.id, environment: d.environment, status: d.status },
      });
    }
  }

  // Sort all items by timestamp descending
  items.sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Apply limit and build cursor from last item's timestamp
  const hasMore = items.length > limit;
  const pageItems = items.slice(0, limit);
  const nextCursor =
    hasMore && pageItems.length > 0
      ? pageItems[pageItems.length - 1].timestamp
      : null;

  reply.code(200).send({
    items: pageItems,
    cursor: nextCursor,
    hasMore,
  });
}
