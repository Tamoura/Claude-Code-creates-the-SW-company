import { FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import { WebhookService } from './service.js';
import {
  pushEventSchema,
  pullRequestEventSchema,
  deploymentEventSchema,
} from './schemas.js';
import { UnauthorizedError } from '../../lib/errors.js';
import { logger } from '../../utils/logger.js';

const HANDLED_EVENTS = ['push', 'pull_request', 'deployment', 'deployment_status'];

export class WebhookHandlers {
  constructor(private service: WebhookService) {}

  async handleGitHub(request: FastifyRequest, reply: FastifyReply) {
    const signature = request.headers['x-hub-signature-256'] as string;
    const event = request.headers['x-github-event'] as string;
    const deliveryId = request.headers['x-github-delivery'] as string;

    if (!signature || !event || !deliveryId) {
      throw new UnauthorizedError('Missing required webhook headers');
    }

    // Use the raw body bytes captured by our content-type parser.
    // GitHub signs the exact HTTP body bytes, not a JSON.stringify'd
    // reconstruction which can differ in key order or whitespace.
    const rawBody = request.rawBody ?? JSON.stringify(request.body);

    // Get webhook secret from env or repo-specific secret
    const webhookSecret =
      process.env.GITHUB_WEBHOOK_SECRET || '';

    if (!this.service.verifySignature(rawBody, signature, webhookSecret)) {
      logger.warn('Invalid webhook signature', {
        deliveryId,
        event,
      });
      throw new UnauthorizedError('Invalid webhook signature');
    }

    logger.info('Webhook received', {
      event,
      deliveryId,
    });

    // Ignore unhandled events
    if (!HANDLED_EVENTS.includes(event)) {
      return reply.code(200).send({
        status: 'ignored',
        event,
        deliveryId,
      });
    }

    switch (event) {
      case 'push': {
        const parsed = pushEventSchema.safeParse(request.body);
        if (!parsed.success) {
          return this.validationError(reply, parsed.error);
        }
        const pushResult = await this.service.processPushEvent(
          parsed.data
        );
        return reply.code(200).send(pushResult);
      }

      case 'pull_request': {
        const parsed = pullRequestEventSchema.safeParse(request.body);
        if (!parsed.success) {
          return this.validationError(reply, parsed.error);
        }
        const prResult =
          await this.service.processPullRequestEvent(parsed.data);
        return reply.code(200).send(prResult);
      }

      case 'deployment': {
        const parsed = deploymentEventSchema.safeParse(request.body);
        if (!parsed.success) {
          return this.validationError(reply, parsed.error);
        }
        const deployResult =
          await this.service.processDeploymentEvent(parsed.data);
        return reply.code(200).send(deployResult);
      }

      case 'deployment_status':
        // For now, just acknowledge
        return reply.code(200).send({
          status: 'processed',
          event: 'deployment_status',
        });

      default:
        return reply.code(200).send({
          status: 'ignored',
          event,
          deliveryId,
        });
    }
  }

  private validationError(reply: FastifyReply, error: ZodError) {
    return reply.code(422).send({
      type: 'https://pulse.dev/errors/validation-error',
      title: 'Validation Error',
      status: 422,
      detail: 'Webhook payload validation failed',
      errors: error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }
}
