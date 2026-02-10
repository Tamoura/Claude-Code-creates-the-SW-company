/**
 * Activity module Zod schemas.
 * Validates WebSocket messages and REST query params.
 */

import { z } from 'zod';

// ── Event types ──────────────────────────────────────────
export const ActivityEventType = z.enum([
  'commit',
  'pull_request',
  'review',
  'deployment',
]);
export type ActivityEventType = z.infer<typeof ActivityEventType>;

// ── WebSocket client messages ────────────────────────────
export const wsAuthMessageSchema = z.object({
  type: z.literal('auth'),
  token: z.string().min(1),
});

export const wsSubscribeMessageSchema = z.object({
  type: z.literal('subscribe'),
  room: z.string().regex(/^(team|repo):[a-zA-Z0-9_-]+$/, 'Invalid room format'),
});

export const wsUnsubscribeMessageSchema = z.object({
  type: z.literal('unsubscribe'),
  room: z.string().regex(/^(team|repo):[a-zA-Z0-9_-]+$/, 'Invalid room format'),
});

export const wsPongMessageSchema = z.object({
  type: z.literal('pong'),
});

export const wsClientMessageSchema = z.discriminatedUnion('type', [
  wsAuthMessageSchema,
  wsSubscribeMessageSchema,
  wsUnsubscribeMessageSchema,
  wsPongMessageSchema,
]);

export type WsClientMessage = z.infer<typeof wsClientMessageSchema>;

// ── WebSocket server messages ────────────────────────────
export const activityEventSchema = z.object({
  type: ActivityEventType,
  repo: z.string(),
  author: z.string(),
  timestamp: z.string().datetime(),
  summary: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

export type ActivityEvent = z.infer<typeof activityEventSchema>;

export const wsServerMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('authenticated'),
    userId: z.string(),
  }),
  z.object({
    type: z.literal('subscribed'),
    room: z.string(),
  }),
  z.object({
    type: z.literal('unsubscribed'),
    room: z.string(),
  }),
  z.object({
    type: z.literal('event'),
    room: z.string(),
    event: activityEventSchema,
  }),
  z.object({
    type: z.literal('ping'),
  }),
  z.object({
    type: z.literal('error'),
    message: z.string(),
    code: z.string().optional(),
  }),
]);

export type WsServerMessage = z.infer<typeof wsServerMessageSchema>;

// ── REST query params ────────────────────────────────────
export const activityFeedQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  repoId: z.string().optional(),
  teamId: z.string().optional(),
  eventType: ActivityEventType.optional(),
  since: z.string().datetime().optional(),
  until: z.string().datetime().optional(),
});

export type ActivityFeedQuery = z.infer<typeof activityFeedQuerySchema>;
