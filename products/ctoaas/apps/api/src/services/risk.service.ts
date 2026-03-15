import { PrismaClient, RiskCategory, RiskStatus, RiskTrend } from '@prisma/client';
import { AppError } from '../lib/errors';

// ---------- Types ----------

interface TechStack {
  languages?: string[];
  frameworks?: string[];
  databases?: string[];
}

interface OrganizationData {
  name: string;
  industry: string;
  employeeCount: number;
  growthStage: string;
  foundedYear?: number | null;
  challenges: string[];
}

interface ProfileData {
  techStack: TechStack;
  cloudProvider?: string | null;
  architectureNotes?: string | null;
  constraints?: string | null;
  organization: OrganizationData;
}

export interface GeneratedRisk {
  category: 'TECH_DEBT' | 'VENDOR' | 'COMPLIANCE' | 'OPERATIONAL';
  title: string;
  description: string;
  severity: number;
  trend: 'IMPROVING' | 'STABLE' | 'WORSENING';
  mitigations: string[];
  affectedSystems: string[];
}

interface RiskItemLike {
  id: string;
  category: 'TECH_DEBT' | 'VENDOR' | 'COMPLIANCE' | 'OPERATIONAL';
  title: string;
  severity: number;
  trend: 'IMPROVING' | 'STABLE' | 'WORSENING';
  status: 'ACTIVE' | 'MITIGATED' | 'DISMISSED';
}

interface CategorySummary {
  category: 'TECH_DEBT' | 'VENDOR' | 'COMPLIANCE' | 'OPERATIONAL';
  score: number;
  trend: 'IMPROVING' | 'STABLE' | 'WORSENING';
  activeCount: number;
}

// ---------- EOL / outdated technology database ----------

const EOL_TECHNOLOGIES: Record<string, { severity: number; description: string }> = {
  'python 2': { severity: 9, description: 'Python 2 reached end-of-life in January 2020. No security patches are issued.' },
  'python 2.7': { severity: 9, description: 'Python 2.7 reached end-of-life in January 2020. No security patches are issued.' },
  'java 8': { severity: 7, description: 'Java 8 is past its free public update period for many vendors. Consider upgrading to a current LTS release.' },
  'angularjs': { severity: 8, description: 'AngularJS reached end-of-life in December 2021. No security patches are issued.' },
  'rails 4': { severity: 7, description: 'Rails 4.x is no longer maintained. Security vulnerabilities will not be patched.' },
  'mysql 5.5': { severity: 8, description: 'MySQL 5.5 reached end-of-life in December 2018. No security patches are issued.' },
  'mysql 5.6': { severity: 7, description: 'MySQL 5.6 reached end-of-life in February 2021. Upgrade recommended.' },
  'node 10': { severity: 8, description: 'Node.js 10 reached end-of-life in April 2021.' },
  'node 12': { severity: 7, description: 'Node.js 12 reached end-of-life in April 2022.' },
  'jquery 2': { severity: 7, description: 'jQuery 2.x is no longer maintained. Upgrade to jQuery 3.x or remove dependency.' },
  'react 15': { severity: 7, description: 'React 15 is severely outdated and no longer supported.' },
  'php 5': { severity: 9, description: 'PHP 5 reached end-of-life. Critical security vulnerabilities remain unpatched.' },
  'php 7.0': { severity: 8, description: 'PHP 7.0 is no longer supported.' },
  'ruby 2.5': { severity: 7, description: 'Ruby 2.5 is past end-of-life.' },
  'ruby 2.6': { severity: 7, description: 'Ruby 2.6 is past end-of-life.' },
};

/** Industries that require strict compliance */
const REGULATED_INDUSTRIES = ['healthcare', 'fintech', 'finance', 'banking', 'insurance'];

// ---------- Service ----------

export class RiskService {
  private prisma?: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Generate risk items from a company profile (pure logic, no DB).
   * Returns an empty array if the profile is too incomplete to analyze.
   */
  generateRisksFromProfile(profile: ProfileData): GeneratedRisk[] {
    // Check profile completeness — skip if < 25%
    if (this.isProfileIncomplete(profile)) {
      return [];
    }

    const risks: GeneratedRisk[] = [];

    // Tech-debt risks: EOL / outdated technologies
    risks.push(...this.detectTechDebtRisks(profile));

    // Vendor risks: single-cloud dependency
    risks.push(...this.detectVendorRisks(profile));

    // Compliance risks: missing security practices in regulated industries
    risks.push(...this.detectComplianceRisks(profile));

    // Operational risks: team size vs complexity mismatch
    risks.push(...this.detectOperationalRisks(profile));

    return risks;
  }

  /**
   * Calculate the average severity for active risks in a category.
   * Excludes mitigated and dismissed risks.
   * Returns 0 if no active risks exist.
   */
  calculateCategoryScore(
    risks: RiskItemLike[],
    category: string
  ): number {
    const activeInCategory = risks.filter(
      (r) => r.category === category && r.status === 'ACTIVE'
    );

    if (activeInCategory.length === 0) return 0;

    const totalSeverity = activeInCategory.reduce(
      (sum, r) => sum + r.severity,
      0
    );
    return Math.round(totalSeverity / activeInCategory.length);
  }

  /**
   * Build a summary of all 4 risk categories with scores and trends.
   */
  getRiskSummary(risks: RiskItemLike[]): CategorySummary[] {
    const categories: Array<'TECH_DEBT' | 'VENDOR' | 'COMPLIANCE' | 'OPERATIONAL'> = [
      'TECH_DEBT',
      'VENDOR',
      'COMPLIANCE',
      'OPERATIONAL',
    ];

    return categories.map((category) => {
      const score = this.calculateCategoryScore(risks, category);
      const activeRisks = risks.filter(
        (r) => r.category === category && r.status === 'ACTIVE'
      );
      const trend = this.determineCategoryTrend(activeRisks);

      return {
        category,
        score,
        trend,
        activeCount: activeRisks.length,
      };
    });
  }

  /**
   * Validate whether a status transition is allowed.
   */
  validateStatusTransition(
    currentStatus: string,
    newStatus: string
  ): { valid: boolean; reason?: string } {
    const validStatuses = ['ACTIVE', 'MITIGATED', 'DISMISSED'];
    if (!validStatuses.includes(newStatus)) {
      return { valid: false, reason: `Invalid status: ${newStatus}` };
    }

    // Active can transition to mitigated or dismissed
    if (currentStatus === 'ACTIVE' && (newStatus === 'MITIGATED' || newStatus === 'DISMISSED')) {
      return { valid: true };
    }

    // Mitigated can transition back to active
    if (currentStatus === 'MITIGATED' && newStatus === 'ACTIVE') {
      return { valid: true };
    }

    // Dismissed can transition back to active
    if (currentStatus === 'DISMISSED' && newStatus === 'ACTIVE') {
      return { valid: true };
    }

    return { valid: false, reason: `Cannot transition from ${currentStatus} to ${newStatus}` };
  }

  // ---------- DB-backed methods ----------

  private requirePrisma(): PrismaClient {
    if (!this.prisma) {
      throw new Error('PrismaClient is required for this operation');
    }
    return this.prisma;
  }

  /**
   * Get risk summary for an organization from the database.
   */
  async getRiskSummaryForOrg(organizationId: string): Promise<CategorySummary[]> {
    const prisma = this.requirePrisma();

    const risks = await prisma.riskItem.findMany({
      where: { organizationId },
    });

    const mapped: RiskItemLike[] = risks.map((r) => ({
      id: r.id,
      category: r.category as RiskItemLike['category'],
      title: r.title,
      severity: r.severity,
      trend: r.trend as RiskItemLike['trend'],
      status: r.status as RiskItemLike['status'],
    }));

    return this.getRiskSummary(mapped);
  }

  /**
   * Get risks by category for an organization.
   */
  async getRisksByCategory(
    organizationId: string,
    category: RiskCategory,
    filters?: { status?: RiskStatus }
  ): Promise<unknown[]> {
    const prisma = this.requirePrisma();

    const where: Record<string, unknown> = {
      organizationId,
      category,
    };

    if (filters?.status) {
      where.status = filters.status;
    }

    const risks = await prisma.riskItem.findMany({
      where,
      orderBy: { severity: 'desc' },
    });

    return risks.map((r) => ({
      id: r.id,
      category: r.category,
      title: r.title,
      description: r.description,
      severity: r.severity,
      trend: r.trend,
      status: r.status,
      mitigations: typeof r.mitigations === 'string' ? JSON.parse(r.mitigations as string) : r.mitigations,
      affectedSystems: typeof r.affectedSystems === 'string' ? JSON.parse(r.affectedSystems as string) : r.affectedSystems,
      identifiedAt: r.identifiedAt,
      updatedAt: r.updatedAt,
    }));
  }

  /**
   * Get a single risk item by ID, scoped to the organization.
   */
  async getRiskDetail(
    riskId: string,
    organizationId: string
  ): Promise<Record<string, unknown> | null> {
    const prisma = this.requirePrisma();

    const risk = await prisma.riskItem.findFirst({
      where: {
        id: riskId,
        organizationId,
      },
    });

    if (!risk) return null;

    return {
      id: risk.id,
      category: risk.category,
      title: risk.title,
      description: risk.description,
      severity: risk.severity,
      trend: risk.trend,
      status: risk.status,
      mitigations: typeof risk.mitigations === 'string' ? JSON.parse(risk.mitigations as string) : risk.mitigations,
      affectedSystems: typeof risk.affectedSystems === 'string' ? JSON.parse(risk.affectedSystems as string) : risk.affectedSystems,
      identifiedAt: risk.identifiedAt,
      updatedAt: risk.updatedAt,
    };
  }

  /**
   * Update the status of a risk item.
   */
  async updateRiskStatus(
    riskId: string,
    organizationId: string,
    newStatus: RiskStatus
  ): Promise<Record<string, unknown>> {
    const prisma = this.requirePrisma();

    const risk = await prisma.riskItem.findFirst({
      where: { id: riskId, organizationId },
    });

    if (!risk) {
      throw AppError.notFound('Risk item not found');
    }

    const transition = this.validateStatusTransition(risk.status, newStatus);
    if (!transition.valid) {
      throw AppError.badRequest(transition.reason || 'Invalid status transition');
    }

    const updated = await prisma.riskItem.update({
      where: { id: riskId },
      data: { status: newStatus },
    });

    return {
      id: updated.id,
      category: updated.category,
      title: updated.title,
      description: updated.description,
      severity: updated.severity,
      trend: updated.trend,
      status: updated.status,
      mitigations: typeof updated.mitigations === 'string' ? JSON.parse(updated.mitigations as string) : updated.mitigations,
      affectedSystems: typeof updated.affectedSystems === 'string' ? JSON.parse(updated.affectedSystems as string) : updated.affectedSystems,
    };
  }

  /**
   * Generate risks from company profile and persist to database.
   */
  async generateAndPersistRisks(
    organizationId: string
  ): Promise<{ generated: number }> {
    const prisma = this.requirePrisma();

    // Fetch org and profile
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });
    if (!org) throw AppError.notFound('Organization not found');

    const profile = await prisma.companyProfile.findUnique({
      where: { organizationId },
    });
    if (!profile) throw AppError.notFound('Company profile not found');

    const profileData: ProfileData = {
      techStack: (profile.techStack as TechStack) || {},
      cloudProvider: profile.cloudProvider,
      architectureNotes: profile.architectureNotes,
      constraints: profile.constraints,
      organization: {
        name: org.name,
        industry: org.industry,
        employeeCount: org.employeeCount,
        growthStage: org.growthStage,
        foundedYear: org.foundedYear,
        challenges: (org.challenges as string[]) || [],
      },
    };

    const risks = this.generateRisksFromProfile(profileData);

    if (risks.length === 0) {
      return { generated: 0 };
    }

    // Delete existing generated risks before re-generating
    await prisma.riskItem.deleteMany({
      where: { organizationId },
    });

    // Map category string to Prisma enum
    const categoryMap: Record<string, RiskCategory> = {
      TECH_DEBT: 'TECH_DEBT',
      VENDOR: 'VENDOR',
      COMPLIANCE: 'COMPLIANCE',
      OPERATIONAL: 'OPERATIONAL',
    };

    const trendMap: Record<string, RiskTrend> = {
      IMPROVING: 'IMPROVING',
      STABLE: 'STABLE',
      WORSENING: 'WORSENING',
    };

    for (const risk of risks) {
      await prisma.riskItem.create({
        data: {
          organizationId,
          category: categoryMap[risk.category],
          title: risk.title,
          description: risk.description,
          severity: risk.severity,
          trend: trendMap[risk.trend],
          status: 'ACTIVE',
          mitigations: JSON.stringify(risk.mitigations),
          affectedSystems: JSON.stringify(risk.affectedSystems),
        },
      });
    }

    return { generated: risks.length };
  }

  // ---------- Private helpers ----------

  private isProfileIncomplete(profile: ProfileData): boolean {
    const org = profile.organization;
    const ts = profile.techStack || {};

    // Check org basics
    const hasName = org.name && org.name.length > 0;
    const hasIndustry = org.industry && org.industry.length > 0;
    const hasEmployees = org.employeeCount > 0;

    // Check tech stack
    const hasLanguages = Array.isArray(ts.languages) && ts.languages.length > 0;
    const hasFrameworks = Array.isArray(ts.frameworks) && ts.frameworks.length > 0;
    const hasDatabases = Array.isArray(ts.databases) && ts.databases.length > 0;
    const hasTechStack = hasLanguages || hasFrameworks || hasDatabases;

    // Need at least org basics + some tech stack data
    if (!hasName || !hasIndustry || !hasEmployees || !hasTechStack) {
      return true;
    }

    return false;
  }

  private detectTechDebtRisks(profile: ProfileData): GeneratedRisk[] {
    const risks: GeneratedRisk[] = [];
    const ts = profile.techStack || {};
    const allTech = [
      ...(ts.languages || []),
      ...(ts.frameworks || []),
      ...(ts.databases || []),
    ];

    for (const tech of allTech) {
      const normalized = tech.toLowerCase();
      for (const [eolKey, eolInfo] of Object.entries(EOL_TECHNOLOGIES)) {
        if (normalized.includes(eolKey) || eolKey.includes(normalized)) {
          risks.push({
            category: 'TECH_DEBT',
            title: `${tech} end-of-life`,
            description: eolInfo.description,
            severity: eolInfo.severity,
            trend: 'WORSENING',
            mitigations: [],
            affectedSystems: ['backend'],
          });
          break; // only one risk per technology
        }
      }
    }

    return risks;
  }

  private detectVendorRisks(profile: ProfileData): GeneratedRisk[] {
    const risks: GeneratedRisk[] = [];

    // Single cloud dependency
    if (profile.cloudProvider) {
      const archNotes = (profile.architectureNotes || '').toLowerCase();
      const cloudName = profile.cloudProvider;

      // Check for cloud-specific services in architecture notes or databases
      const allTech = [
        ...(profile.techStack?.databases || []),
      ].map((t) => t.toLowerCase());

      const cloudSpecificServices = allTech.some((t) =>
        t.includes('dynamo') ||
        t.includes('elasticache') ||
        t.includes('aurora') ||
        t.includes('bigquery') ||
        t.includes('spanner') ||
        t.includes('cosmosdb')
      );

      const heavyCloudUse =
        archNotes.includes(cloudName.toLowerCase()) ||
        archNotes.includes('lambda') ||
        archNotes.includes('ecs') ||
        archNotes.includes('s3') ||
        archNotes.includes('gke') ||
        archNotes.includes('cloud run') ||
        archNotes.includes('aks') ||
        cloudSpecificServices;

      if (heavyCloudUse) {
        risks.push({
          category: 'VENDOR',
          title: `Single cloud vendor dependency (${cloudName})`,
          description: `Heavy reliance on ${cloudName} services creates vendor lock-in risk. A multi-cloud or cloud-agnostic strategy would reduce dependency on a single provider.`,
          severity: 7,
          trend: 'STABLE',
          mitigations: [],
          affectedSystems: ['infrastructure'],
        });
      } else {
        risks.push({
          category: 'VENDOR',
          title: `Cloud vendor concentration (${cloudName})`,
          description: `All infrastructure runs on ${cloudName}. Consider evaluating multi-cloud strategies to reduce vendor concentration risk.`,
          severity: 5,
          trend: 'STABLE',
          mitigations: [],
          affectedSystems: ['infrastructure'],
        });
      }
    }

    return risks;
  }

  private detectComplianceRisks(profile: ProfileData): GeneratedRisk[] {
    const risks: GeneratedRisk[] = [];
    const industry = profile.organization.industry.toLowerCase();
    const isRegulated = REGULATED_INDUSTRIES.some((ri) =>
      industry.includes(ri)
    );

    if (isRegulated) {
      // Healthcare-specific
      if (industry.includes('healthcare') || industry.includes('health')) {
        risks.push({
          category: 'COMPLIANCE',
          title: 'Potential HIPAA compliance gap',
          description: 'Healthcare industry requires HIPAA compliance. No compliance frameworks or constraints are documented in the company profile.',
          severity: 9,
          trend: 'STABLE',
          mitigations: [],
          affectedSystems: ['security', 'data', 'operations'],
        });
      }

      // Fintech-specific
      if (industry.includes('fintech') || industry.includes('finance') || industry.includes('banking')) {
        risks.push({
          category: 'COMPLIANCE',
          title: 'Financial regulatory compliance gap',
          description: 'Financial services industry requires SOC2, PCI-DSS, and potentially other regulatory compliance. Review and document compliance posture.',
          severity: 8,
          trend: 'STABLE',
          mitigations: [],
          affectedSystems: ['security', 'data', 'operations'],
        });
      }
    }

    // General: no constraints documented = missing security practices
    if (!profile.constraints) {
      risks.push({
        category: 'COMPLIANCE',
        title: 'No security constraints documented',
        description: 'The company profile does not document any security constraints, compliance requirements, or governance policies.',
        severity: isRegulated ? 8 : 5,
        trend: 'STABLE',
        mitigations: [],
        affectedSystems: ['security', 'operations'],
      });
    }

    return risks;
  }

  private detectOperationalRisks(profile: ProfileData): GeneratedRisk[] {
    const risks: GeneratedRisk[] = [];
    const org = profile.organization;
    const ts = profile.techStack || {};

    // Calculate complexity score based on tech stack breadth
    const languageCount = (ts.languages || []).length;
    const frameworkCount = (ts.frameworks || []).length;
    const databaseCount = (ts.databases || []).length;
    const totalTechCount = languageCount + frameworkCount + databaseCount;

    // Check architecture complexity
    const archNotes = (profile.architectureNotes || '').toLowerCase();
    const isMicroservices = archNotes.includes('microservice') || archNotes.includes('micro-service');
    const serviceCount = archNotes.match(/\d+\+?\s*service/)?.[0];

    // Team size vs complexity ratio
    const teamSize = org.employeeCount;
    const complexityScore = totalTechCount + (isMicroservices ? 5 : 0);

    // Flag if complexity per engineer is high
    if (teamSize > 0 && complexityScore / teamSize > 1.5) {
      risks.push({
        category: 'OPERATIONAL',
        title: 'Team capacity vs technology complexity mismatch',
        description: `A team of ${teamSize} managing ${totalTechCount} technologies${serviceCount ? ` across ${serviceCount}` : ''} creates operational risk. Team size may be insufficient to maintain the current technology breadth and system complexity.`,
        severity: Math.min(9, Math.round(complexityScore / teamSize) + 4),
        trend: 'WORSENING',
        mitigations: [],
        affectedSystems: ['engineering', 'operations'],
      });
    }

    // Hiring challenges
    if (org.challenges.includes('hiring-senior-engineers')) {
      risks.push({
        category: 'OPERATIONAL',
        title: 'Senior engineering hiring difficulty',
        description: 'Difficulty hiring senior engineers compounds operational risk, especially with a complex technology stack.',
        severity: 6,
        trend: 'STABLE',
        mitigations: [],
        affectedSystems: ['engineering'],
      });
    }

    return risks;
  }

  /**
   * Determine the overall trend for a category from its active risks.
   * If any risk is worsening, the category trend is worsening.
   * If all risks are improving, the category trend is improving.
   * Otherwise stable.
   */
  private determineCategoryTrend(
    activeRisks: RiskItemLike[]
  ): 'IMPROVING' | 'STABLE' | 'WORSENING' {
    if (activeRisks.length === 0) return 'STABLE';

    const hasWorsening = activeRisks.some(
      (r) => r.trend === 'WORSENING'
    );
    if (hasWorsening) return 'WORSENING';

    const allImproving = activeRisks.every(
      (r) => r.trend === 'IMPROVING'
    );
    if (allImproving) return 'IMPROVING';

    return 'STABLE';
  }
}
