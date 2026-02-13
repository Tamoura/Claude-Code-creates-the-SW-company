/**
 * Email Service
 *
 * Pluggable email sending with SMTP or console fallback.
 * Supports notification preferences and HTML templates.
 *
 * Usage:
 *   const email = new EmailService(prisma);
 *   // Or with SMTP:
 *   const email = new EmailService(prisma, { smtp: { host, port, user, pass, from } });
 */

import { logger } from '@connectsw/shared';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from?: string;
}

export interface EmailServiceOptions {
  smtp?: SmtpConfig;
  /** Product name for log messages. Default: 'ConnectSW' */
  productName?: string;
}

export class EmailService {
  private prisma: any;
  private transporter: any = null;
  private smtpFrom: string;
  private productName: string;

  constructor(prisma: any, opts?: EmailServiceOptions) {
    this.prisma = prisma;
    this.productName = opts?.productName ?? 'ConnectSW';
    this.smtpFrom = opts?.smtp?.from ?? 'noreply@connectsw.io';

    if (opts?.smtp) {
      this.initSmtp(opts.smtp);
    }
  }

  private async initSmtp(config: SmtpConfig): Promise<void> {
    try {
      const nodemailer = await import('nodemailer');
      this.transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.port === 465,
        auth: { user: config.user, pass: config.pass },
      });
      logger.info('Email service configured with SMTP');
    } catch {
      logger.warn('nodemailer not available, using log-only email');
    }
  }

  async send(message: EmailMessage): Promise<boolean> {
    try {
      if (this.transporter) {
        await this.transporter.sendMail({
          from: this.smtpFrom,
          to: message.to,
          subject: message.subject,
          html: message.html,
        });
        logger.info('Email sent', { to: message.to, subject: message.subject });
      } else {
        logger.info(`Email (dev mode): to=${message.to} subject=${message.subject}`);
      }
      return true;
    } catch (error) {
      logger.error('Failed to send email', { to: message.to, error: (error as Error).message });
      return false;
    }
  }

  /**
   * Get or create notification preferences for a user.
   * Uses the `notification_preferences` table.
   */
  async getNotificationPreferences(userId: string) {
    let prefs = await this.prisma.notificationPreference.findUnique({ where: { userId } });

    if (!prefs) {
      prefs = await this.prisma.notificationPreference.create({
        data: { userId },
      });
    }

    return prefs;
  }

  /**
   * Update notification preferences. Only updates provided fields.
   */
  async updateNotificationPreferences(userId: string, updates: Record<string, boolean>) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      update: updates,
      create: { userId, ...updates },
    });
  }
}
