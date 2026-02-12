import { Dimension } from '@prisma/client';

/**
 * Type-safe interfaces for Prisma query results.
 *
 * These replace `as any` casts on groupBy, findMany,
 * and aggregation results throughout the codebase.
 */

/** Result shape from prisma.model.groupBy({ by: ['dimension'], _count: true }) */
export interface GroupByDimension {
  dimension: Dimension;
  _count: number;
}

/** Result shape from childMilestone.findMany with milestone.dimension selected */
export interface ChildMilestoneWithDimension {
  milestone: {
    dimension: Dimension;
  };
}

/**
 * Result shape from childMilestone.findMany with full milestone relation
 * and achieved fields selected (used in dashboard activity feed).
 */
export interface ChildMilestoneWithMilestone {
  id: string;
  achieved: boolean;
  achievedAt: Date | null;
  createdAt: Date;
  milestone: {
    dimension: Dimension;
    title: string;
    ageBand: string;
  };
}

/**
 * Result from childMilestone.findMany with achieved + milestone
 * dimension and ageBand (used in dashboard score calculation).
 */
export interface ChildMilestoneForScoring {
  achieved: boolean;
  milestone: {
    dimension: Dimension;
    ageBand: string;
  };
}

/** Result from observation.findMany with dimension and sentiment selected */
export interface ObservationDimensionSentiment {
  dimension: Dimension;
  sentiment: string;
}

/** Result from observation.findMany with dimension only */
export interface ObservationDimension {
  dimension: Dimension;
}

/** Observation record for reports (with all display fields) */
export interface ObservationForReport {
  id: string;
  dimension: Dimension;
  content: string;
  sentiment: string;
  observedAt: Date;
  tags: string[];
  createdAt: Date;
}
