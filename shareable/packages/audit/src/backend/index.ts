// Services
export { AuditLogService } from './services/audit-log.service.js';
export type { AuditEntry, AuditRecordInput, AuditQueryFilters } from './services/audit-log.service.js';

// Middleware
export { createAuditHook } from './middleware/audit-hook.js';
export type { AuditHookOptions } from './middleware/audit-hook.js';

// Routes
export { default as auditRoutes } from './routes/audit.js';
export type { AuditRoutesOptions } from './routes/audit.js';
