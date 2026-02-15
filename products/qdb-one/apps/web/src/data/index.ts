/**
 * Mock Data - Central Export
 * QDB One Unified Portal Prototype
 *
 * This file provides a single entry point for all mock data fixtures.
 * All data is hardcoded JSON with no API calls - suitable for prototype development.
 */

// Persons & Organizations
export * from './persons';

// Financing Portal
export * from './financing';

// Guarantee Portal
export * from './guarantees';

// Advisory Portal
export * from './advisory';

// Cross-Portal
export * from './notifications';
export * from './activity';
export * from './documents';

// Admin
export * from './admin';

/**
 * Usage Examples:
 *
 * // Get person by QID
 * import { getPersonByQid } from '@/data';
 * const person = getPersonByQid('28412345678');
 *
 * // Get all loans for an organization
 * import { getLoansByOrg } from '@/data';
 * const loans = getLoansByOrg('org-001');
 *
 * // Get pending signature guarantees
 * import { getPendingSignatures } from '@/data';
 * const pendingGuarantees = getPendingSignatures('person-001');
 *
 * // Get unread notifications
 * import { getUnreadNotifications } from '@/data';
 * const unread = getUnreadNotifications('person-001');
 *
 * // Get recent activity
 * import { getActivitiesByPerson } from '@/data';
 * const recentActivity = getActivitiesByPerson('person-001', 10);
 */
