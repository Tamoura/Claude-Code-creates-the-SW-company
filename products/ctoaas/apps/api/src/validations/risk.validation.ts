import { z } from 'zod';

export const riskStatusUpdateSchema = z.object({
  status: z.enum(['ACTIVE', 'MITIGATED', 'DISMISSED'], {
    errorMap: () => ({
      message: 'Status must be one of: ACTIVE, MITIGATED, DISMISSED',
    }),
  }),
});

export type RiskStatusUpdateInput = z.infer<typeof riskStatusUpdateSchema>;

export const riskCategoryParamSchema = z.enum(
  ['tech-debt', 'vendor', 'compliance', 'operational'],
  {
    errorMap: () => ({
      message:
        'Category must be one of: tech-debt, vendor, compliance, operational',
    }),
  }
);

export const riskStatusFilterSchema = z
  .enum(['active', 'mitigated', 'dismissed'])
  .optional();

/**
 * Map URL-friendly category slug to Prisma enum value.
 */
export function categorySlugToEnum(
  slug: string
): 'TECH_DEBT' | 'VENDOR' | 'COMPLIANCE' | 'OPERATIONAL' {
  const map: Record<string, 'TECH_DEBT' | 'VENDOR' | 'COMPLIANCE' | 'OPERATIONAL'> = {
    'tech-debt': 'TECH_DEBT',
    vendor: 'VENDOR',
    compliance: 'COMPLIANCE',
    operational: 'OPERATIONAL',
  };
  return map[slug];
}

/**
 * Map URL-friendly status filter to Prisma enum value.
 */
export function statusFilterToEnum(
  filter: string
): 'ACTIVE' | 'MITIGATED' | 'DISMISSED' {
  const map: Record<string, 'ACTIVE' | 'MITIGATED' | 'DISMISSED'> = {
    active: 'ACTIVE',
    mitigated: 'MITIGATED',
    dismissed: 'DISMISSED',
  };
  return map[filter];
}
