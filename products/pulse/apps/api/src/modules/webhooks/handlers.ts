import { FastifyRequest, FastifyReply } from 'fastify';
import { WebhookService } from './service.js';
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

    // Get raw body for signature verification
    const rawBody = JSON.stringify(request.body);

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

    const body = request.body as any;

    switch (event) {
      case 'push':
        const pushResult = await this.service.processPushEvent(body);
        return reply.code(200).send(pushResult);

      case 'pull_request':
        const prResult =
          await this.service.processPullRequestEvent(body);
        return reply.code(200).send(prResult);

      case 'deployment':
        const deployResult =
          await this.service.processDeploymentEvent(body);
        return reply.code(200).send(deployResult);

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
}
