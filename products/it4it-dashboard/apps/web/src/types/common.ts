/**
 * IT4IT Value Streams
 */
export type ValueStream = "s2p" | "r2d" | "r2f" | "d2c";

/**
 * Value Stream Metadata
 */
export interface ValueStreamMeta {
  id: ValueStream;
  name: string;
  description: string;
  color: string;
  icon: string;
}

/**
 * Navigation Item
 */
export interface NavItem {
  title: string;
  href: string;
  icon?: string;
  badge?: string;
  children?: NavItem[];
}

/**
 * Breadcrumb Item
 */
export interface BreadcrumbItem {
  title: string;
  href?: string;
}

/**
 * User Profile
 */
export interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
  role: string;
}

/**
 * Dashboard KPI
 */
export interface KPI {
  label: string;
  value: string | number;
  change?: number;
  trend?: "up" | "down" | "neutral";
  format?: "number" | "currency" | "percent";
}
