import { z } from 'zod';

export const IndustryEnum = z.enum([
  'finance',
  'pharmaceuticals',
  'logistics',
  'materials-science',
  'ai-ml',
  'security',
  'environmental',
  'chemistry',
]);

export const ProblemTypeEnum = z.enum([
  'optimization',
  'simulation',
  'machine-learning',
  'cryptography',
]);

export const MaturityLevelEnum = z.enum([
  'theoretical',
  'experimental',
  'pre-production',
  'production-ready',
]);

export const UseCaseSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  shortDescription: z.string(),
  fullDescription: z.string(),
  industry: z.array(IndustryEnum),
  problemType: ProblemTypeEnum,
  maturityLevel: MaturityLevelEnum,
  quantumAdvantage: z.string(),
  timeline: z.object({
    current: z.string(),
    nearTerm: z.string(),
    longTerm: z.string(),
  }),
  requirements: z.object({
    qubits: z.number(),
    gateDepth: z.number(),
    errorRate: z.number(),
    coherenceTime: z.string(),
  }),
  examples: z.array(
    z.object({
      company: z.string(),
      description: z.string(),
      link: z.string().optional(),
    })
  ),
  relatedUseCases: z.array(z.string()),
  lastUpdated: z.string(),
});

export type UseCase = z.infer<typeof UseCaseSchema>;
export type Industry = z.infer<typeof IndustryEnum>;
export type ProblemType = z.infer<typeof ProblemTypeEnum>;
export type MaturityLevel = z.infer<typeof MaturityLevelEnum>;
