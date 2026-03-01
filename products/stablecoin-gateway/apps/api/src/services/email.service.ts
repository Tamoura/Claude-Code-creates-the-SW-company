/**
 * Email Service
 *
 * Handles email notifications for payment receipts and merchant notifications.
 *
 * Design:
 * - Console-based logging for development (no external dependencies)
 * - Real HTML templates for customer receipts and merchant notifications
 * - Notification preferences management via database
 * - Default preferences auto-created on first access
 * - Future: Can be extended to use SMTP or services like Resend/SendGrid
 *
 * Usage:
 * - sendPaymentReceipt: Sends receipt to customer after successful payment
 * - sendMerchantNotification: Notifies merchant of payment events
 * - getNotificationPreferences: Retrieves user's email preferences
 * - updateNotificationPreferences: Updates user's email preferences
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

export interface SendPaymentReceiptParams {
  to: string;
  paymentId: string;
  amount: number;
  currency: string;
  merchantName: string;
  txHash?: string;
}

export interface SendMerchantNotificationParams {
  to: string;
  event: string;
  paymentId: string;
  amount: number;
  currency: string;
  customerAddress?: string;
}

export interface NotificationPrefs {
  emailOnPaymentReceived?: boolean;
  emailOnRefundProcessed?: boolean;
  emailOnPaymentFailed?: boolean;
  sendCustomerReceipt?: boolean;
}

interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

/**
 * Default notification preferences for new users
 */
const DEFAULT_PREFERENCES = {
  emailOnPaymentReceived: true,
  emailOnRefundProcessed: true,
  emailOnPaymentFailed: false,
  sendCustomerReceipt: true,
};

/**
 * Escape HTML special characters to prevent XSS in email templates.
 * Applied to all user-controlled values before HTML interpolation.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export class EmailService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Send payment receipt to customer
   *
   * Generates HTML receipt with payment details and transaction information.
   * In development, logs to console. In production, would send via SMTP.
   *
   * @returns true if email sent/logged successfully
   */
  async sendPaymentReceipt(params: SendPaymentReceiptParams): Promise<boolean> {
    try {
      const html = this.generateReceiptHtml({
        paymentId: params.paymentId,
        amount: params.amount,
        currency: params.currency,
        merchantName: params.merchantName,
        txHash: params.txHash,
      });

      const message: EmailMessage = {
        to: params.to,
        subject: `Payment Receipt - ${params.merchantName}`,
        html,
      };

      return await this.sendEmail(message);
    } catch (error) {
      logger.error('Failed to send payment receipt', error);
      return false;
    }
  }

  /**
   * Send notification to merchant about payment event
   *
   * Notifies merchant of important payment events like:
   * - payment.received
   * - payment.failed
   * - refund.processed
   *
   * @returns true if email sent/logged successfully
   */
  async sendMerchantNotification(params: SendMerchantNotificationParams): Promise<boolean> {
    try {
      const html = this.generateMerchantNotificationHtml({
        event: params.event,
        paymentId: params.paymentId,
        amount: params.amount,
        currency: params.currency,
        customerAddress: params.customerAddress,
      });

      const eventTitles: Record<string, string> = {
        'payment.received': 'Payment Received',
        'payment.failed': 'Payment Failed',
        'refund.processed': 'Refund Processed',
      };

      const message: EmailMessage = {
        to: params.to,
        subject: `${eventTitles[params.event] || 'Payment Event'} - ${params.paymentId}`,
        html,
      };

      return await this.sendEmail(message);
    } catch (error) {
      logger.error('Failed to send merchant notification', error);
      return false;
    }
  }

  /**
   * Get user's notification preferences
   *
   * Auto-creates default preferences if none exist.
   */
  async getNotificationPreferences(userId: string) {
    let prefs = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!prefs) {
      prefs = await this.prisma.notificationPreference.create({
        data: {
          userId,
          ...DEFAULT_PREFERENCES,
        },
      });
    }

    return prefs;
  }

  /**
   * Update user's notification preferences
   *
   * Only updates provided fields, leaves others unchanged.
   */
  async updateNotificationPreferences(userId: string, updates: NotificationPrefs) {
    const data: Record<string, boolean> = {};

    if (updates.emailOnPaymentReceived !== undefined) {
      data.emailOnPaymentReceived = updates.emailOnPaymentReceived;
    }
    if (updates.emailOnRefundProcessed !== undefined) {
      data.emailOnRefundProcessed = updates.emailOnRefundProcessed;
    }
    if (updates.emailOnPaymentFailed !== undefined) {
      data.emailOnPaymentFailed = updates.emailOnPaymentFailed;
    }
    if (updates.sendCustomerReceipt !== undefined) {
      data.sendCustomerReceipt = updates.sendCustomerReceipt;
    }

    return await this.prisma.notificationPreference.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...DEFAULT_PREFERENCES,
        ...data,
      },
    });
  }

  /**
   * Generate HTML template for payment receipt
   *
   * Professional, clean design with all payment details.
   */
  generateReceiptHtml(data: {
    paymentId: string;
    amount: number;
    currency: string;
    merchantName: string;
    txHash?: string;
  }): string {
    const { paymentId, amount, currency, merchantName, txHash } = data;
    const safeMerchantName = escapeHtml(merchantName);
    const safePaymentId = escapeHtml(paymentId);
    const safeCurrency = escapeHtml(currency);
    const safeTxHash = txHash ? escapeHtml(txHash) : undefined;
    const date = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Receipt</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #f0f0f0;
    }
    h1 {
      color: #2563eb;
      margin: 0;
      font-size: 24px;
    }
    .receipt-date {
      color: #666;
      font-size: 14px;
      margin-top: 5px;
    }
    .details {
      margin: 30px 0;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    .detail-label {
      color: #666;
      font-weight: 500;
    }
    .detail-value {
      color: #333;
      font-weight: 600;
    }
    .amount {
      font-size: 32px;
      color: #2563eb;
      text-align: center;
      margin: 30px 0;
      font-weight: bold;
    }
    .tx-hash {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 6px;
      margin-top: 20px;
      word-break: break-all;
      font-family: monospace;
      font-size: 12px;
      color: #666;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #f0f0f0;
      color: #999;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Payment Receipt</h1>
      <div class="receipt-date">${date}</div>
    </div>

    <div class="amount">
      ${amount.toFixed(2)} ${safeCurrency}
    </div>

    <div class="details">
      <div class="detail-row">
        <span class="detail-label">Merchant</span>
        <span class="detail-value">${safeMerchantName}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Payment ID</span>
        <span class="detail-value">${safePaymentId}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Amount</span>
        <span class="detail-value">${amount.toFixed(2)} ${safeCurrency}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Status</span>
        <span class="detail-value" style="color: #16a34a;">Completed</span>
      </div>
    </div>

    ${safeTxHash ? `
    <div>
      <strong>Transaction Hash:</strong>
      <div class="tx-hash">${safeTxHash}</div>
    </div>
    ` : ''}

    <div class="footer">
      This is an automated receipt. Please keep it for your records.<br>
      If you have any questions, please contact the merchant directly.
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate HTML template for merchant notification
   *
   * Clean, professional notification with event details.
   */
  generateMerchantNotificationHtml(data: {
    event: string;
    paymentId: string;
    amount: number;
    currency: string;
    customerAddress?: string;
  }): string {
    const { event, paymentId, amount, currency, customerAddress } = data;
    const safePaymentId = escapeHtml(paymentId);
    const safeCurrency = escapeHtml(currency);
    const safeEvent = escapeHtml(event);
    const safeCustomerAddress = customerAddress ? escapeHtml(customerAddress) : undefined;
    const date = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const eventTitles: Record<string, string> = {
      'payment.received': 'Payment Received',
      'payment.failed': 'Payment Failed',
      'refund.processed': 'Refund Processed',
    };

    const eventColors: Record<string, string> = {
      'payment.received': '#16a34a',
      'payment.failed': '#dc2626',
      'refund.processed': '#ea580c',
    };

    const eventTitle = eventTitles[event] || event;
    const eventColor = eventColors[event] || '#2563eb';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${eventTitle}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .event-badge {
      display: inline-block;
      background: ${eventColor};
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 10px;
    }
    h1 {
      color: #333;
      margin: 10px 0;
      font-size: 24px;
    }
    .timestamp {
      color: #666;
      font-size: 14px;
    }
    .details {
      margin: 30px 0;
      background: #f8f9fa;
      padding: 20px;
      border-radius: 6px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
    }
    .detail-label {
      color: #666;
      font-weight: 500;
    }
    .detail-value {
      color: #333;
      font-weight: 600;
      text-align: right;
      word-break: break-word;
      max-width: 60%;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #999;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="event-badge">${eventTitle}</div>
      <h1>Payment Event</h1>
      <div class="timestamp">${date}</div>
    </div>

    <div class="details">
      <div class="detail-row">
        <span class="detail-label">Payment ID</span>
        <span class="detail-value">${safePaymentId}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Event Type</span>
        <span class="detail-value">${safeEvent}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Amount</span>
        <span class="detail-value">${amount.toFixed(2)} ${safeCurrency}</span>
      </div>
      ${safeCustomerAddress ? `
      <div class="detail-row">
        <span class="detail-label">Customer Address</span>
        <span class="detail-value" style="font-family: monospace; font-size: 11px;">${safeCustomerAddress}</span>
      </div>
      ` : ''}
    </div>

    <div class="footer">
      This is an automated notification from your payment gateway.<br>
      Log in to your dashboard to view full details.
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Send email (console-based for development)
   *
   * In development: Logs email to console
   * In production: Would send via SMTP or email service
   *
   * @returns true if successful
   */
  private async sendEmail(message: EmailMessage): Promise<boolean> {
    try {
      // Development: Log via structured logger
      // Production: Use SMTP via nodemailer or service like Resend/SendGrid
      logger.info('Email sent', {
        to: message.to,
        subject: message.subject,
      });

      // In production, you would do:
      // const transporter = nodemailer.createTransport({ ... });
      // await transporter.sendMail({ from: '...', to: message.to, subject: message.subject, html: message.html });

      return true;
    } catch (error) {
      logger.error('Failed to send email', error);
      return false;
    }
  }
}
