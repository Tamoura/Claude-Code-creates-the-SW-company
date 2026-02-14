/**
 * Fastify audit logging hook.
 *
 * Automatically records audit entries for configured routes.
 * Attach to routes via onRequest/onResponse hooks.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { AuditLogService, AuditRecordInput } from '../services/audit-log.service.js';

export interface AuditHookOptions {
  /** The audit log service instance */
  auditService: AuditLogService;
  /** Extract actor from request. Default: request.currentUser?.id ?? 'anonymous' */
  getActor?: (request: FastifyRequest) => string;
  /** Extract action from request. Default: `${method} ${url}` */
  getAction?: (request: FastifyRequest) => string;
  /** Extract resource type. Default: derived from URL path */
  getResourceType?: (request: FastifyRequest) => string;
  /** Extract resource ID. Default: first path param or 'n/a' */
  getResourceId?: (request: FastifyRequest) => string;
  /** Additional details to include. Default: {} */
  getDetails?: (request: FastifyRequest, reply: FastifyReply) => Record<string, unknown>;
  /** Only audit requests matching these methods. Default: all mutating methods */
  methods?: string[];
}

const DEFAULT_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

export function createAuditHook(opts: AuditHookOptions) {
  const {
    auditService,
    getActor = (req: FastifyRequest) => (req as any).currentUser?.id ?? 'anonymous',
    getAction = (req: FastifyRequest) => `${req.method} ${req.url}`,
    getResourceType = (req: FastifyRequest) => {
      const parts = req.url.split('/').filter(Boolean);
      // Find the resource name (skip 'v1', 'api', etc.)
      return parts.find((p) => !p.startsWith('v') && !/^\d+$/.test(p)) ?? 'unknown';
    },
    getResourceId = (req: FastifyRequest) => {
      const params = req.params as Record<string, string>;
      return params?.id ?? 'n/a';
    },
    getDetails,
    methods = DEFAULT_METHODS,
  } = opts;

  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!methods.includes(request.method)) return;

    const input: AuditRecordInput = {
      actor: getActor(request),
      action: getAction(request),
      resourceType: getResourceType(request),
      resourceId: getResourceId(request),
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      details: getDetails ? getDetails(request, reply) : undefined,
    };

    // Fire-and-forget
    auditService.record(input);
  };
}
