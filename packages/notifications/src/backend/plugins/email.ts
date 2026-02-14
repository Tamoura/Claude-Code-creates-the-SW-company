/**
 * Fastify Email Plugin
 *
 * Decorates fastify with an `email` service for sending emails.
 * Supports SMTP transport or console fallback.
 */

import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { logger } from '@connectsw/shared';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

export interface EmailPluginOptions {
  smtp?: {
    host: string;
    port: number;
    user: string;
    pass: string;
    from?: string;
  };
}

declare module 'fastify' {
  interface FastifyInstance {
    email: EmailSender;
  }
}

const emailPlugin: FastifyPluginAsync<EmailPluginOptions> = async (fastify, opts) => {
  const smtpFrom = opts.smtp?.from ?? 'noreply@connectsw.io';
  let transporter: { sendMail(opts: { from: string; to: string; subject: string; html: string }): Promise<unknown> } | null = null;

  if (opts.smtp) {
    try {
      const nodemailer = await import('nodemailer');
      transporter = nodemailer.createTransport({
        host: opts.smtp.host,
        port: opts.smtp.port,
        secure: opts.smtp.port === 465,
        auth: { user: opts.smtp.user, pass: opts.smtp.pass },
      });
      logger.info('Email plugin: SMTP transport configured');
    } catch {
      logger.warn('Email plugin: nodemailer unavailable, using console fallback');
    }
  } else {
    logger.info('Email plugin: No SMTP config, using console fallback');
  }

  const emailSender: EmailSender = {
    async send(message: EmailMessage): Promise<void> {
      if (transporter) {
        await transporter.sendMail({
          from: smtpFrom,
          to: message.to,
          subject: message.subject,
          html: message.html,
        });
        logger.info('Email sent', { to: message.to, subject: message.subject });
      } else {
        logger.info(`Email (dev): to=${message.to} subject=${message.subject}`);
      }
    },
  };

  fastify.decorate('email', emailSender);
};

export default fp(emailPlugin, { name: 'email' });
