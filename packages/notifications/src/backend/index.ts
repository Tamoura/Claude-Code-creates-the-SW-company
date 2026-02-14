// Services
export { EmailService } from './services/email.service.js';
export type { EmailMessage, SmtpConfig, EmailServiceOptions } from './services/email.service.js';

export { NotificationService } from './services/notification.service.js';
export type { CreateNotificationInput, NotificationListOptions } from './services/notification.service.js';

// Plugins
export { default as emailPlugin } from './plugins/email.js';
export type { EmailSender, EmailPluginOptions } from './plugins/email.js';

// Routes
export { default as notificationRoutes } from './routes/notifications.js';
export { default as preferencesRoutes } from './routes/preferences.js';
export type { PreferencesRoutesOptions } from './routes/preferences.js';

// Templates
export { escapeHtml, buildEmailHtml, detailRow } from './templates/base-email.js';
export type { EmailTemplateOptions } from './templates/base-email.js';
