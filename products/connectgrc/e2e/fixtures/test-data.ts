/**
 * Test data definitions for ConnectGRC E2E tests
 *
 * All test data is defined here for consistency.
 * Actual seeding is done via the API seed script or direct DB access.
 */

/** GRC domains as defined in PRD Section 6.2 */
export const GRC_DOMAINS = [
  'GOVERNANCE',
  'RISK_MANAGEMENT',
  'COMPLIANCE',
  'INFORMATION_SECURITY',
  'AUDIT',
  'BUSINESS_CONTINUITY',
] as const;

export type GrcDomain = (typeof GRC_DOMAINS)[number];

/** Professional tiers from PRD Section 6.2 */
export const PROFESSIONAL_TIERS = [
  'Foundation',
  'Developing',
  'Proficient',
  'Expert',
] as const;

/** All public routes that should be accessible without authentication */
export const PUBLIC_ROUTES = [
  { path: '/', name: 'Landing Page' },
  { path: '/about', name: 'About' },
  { path: '/how-it-works', name: 'How It Works' },
  { path: '/for-talents', name: 'For Talents' },
  { path: '/for-employers', name: 'For Employers' },
  { path: '/pricing', name: 'Pricing' },
  { path: '/contact', name: 'Contact' },
  { path: '/terms', name: 'Terms' },
] as const;

/** Auth routes */
export const AUTH_ROUTES = [
  { path: '/login', name: 'Login' },
  { path: '/register', name: 'Register' },
  { path: '/forgot-password', name: 'Forgot Password' },
  { path: '/reset-password', name: 'Reset Password' },
  { path: '/verify-email', name: 'Verify Email' },
] as const;

/** Authenticated (app) routes — require login */
export const APP_ROUTES = [
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/profile', name: 'Profile' },
  { path: '/assessment', name: 'Assessment' },
  { path: '/career', name: 'Career Simulator' },
  { path: '/jobs', name: 'Jobs' },
  { path: '/resources', name: 'Resources' },
  { path: '/notifications', name: 'Notifications' },
] as const;

/** Admin routes — require ADMIN role */
export const ADMIN_ROUTES = [
  { path: '/admin', name: 'Admin Dashboard' },
  { path: '/admin/users', name: 'Admin Users' },
  { path: '/admin/frameworks', name: 'Admin Frameworks' },
  { path: '/admin/questions', name: 'Admin Questions' },
  { path: '/admin/analytics', name: 'Admin Analytics' },
] as const;

/** Header navigation links (public site) */
export const HEADER_NAV_LINKS = [
  { label: 'For Talents', href: '/for-talents' },
  { label: 'For Employers', href: '/for-employers' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Resources', href: '/resources' },
] as const;

/** Sidebar navigation links (authenticated app) */
export const SIDEBAR_NAV_LINKS = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Profile', href: '/profile' },
  { label: 'Assessment', href: '/assessment' },
  { label: 'Career', href: '/career' },
  { label: 'Jobs', href: '/jobs' },
  { label: 'Resources', href: '/resources' },
  { label: 'Notifications', href: '/notifications' },
] as const;
