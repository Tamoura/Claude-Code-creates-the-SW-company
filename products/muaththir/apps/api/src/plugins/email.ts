import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { logger } from '../utils/logger';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

export interface EmailService {
  send(message: EmailMessage): Promise<void>;
}

const emailPlugin: FastifyPluginAsync = async (fastify) => {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || 'noreply@muaththir.app';

  const hasSmtpConfig = smtpHost && smtpUser && smtpPass;

  let transporter: any = null;

  if (hasSmtpConfig) {
    // Only import nodemailer when SMTP is configured
    try {
      const nodemailer = await import('nodemailer');
      transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
      logger.info('Email service configured with SMTP transport');
    } catch {
      logger.warn('nodemailer not available, falling back to log-only email');
    }
  } else {
    logger.info('SMTP not configured, email service will log emails instead of sending');
  }

  const emailService: EmailService = {
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
        // Development/test mode: log the email content
        logger.info('Email (dev mode - not sent)', {
          to: message.to,
          subject: message.subject,
          htmlLength: message.html.length,
        });
      }
    },
  };

  fastify.decorate('email', emailService);
};

export default fp(emailPlugin, {
  name: 'email',
});
