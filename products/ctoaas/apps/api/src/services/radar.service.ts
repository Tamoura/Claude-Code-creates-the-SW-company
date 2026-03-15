import { PrismaClient, TechRadarItem } from '@prisma/client';
import { AppError } from '../lib/errors';

// ---------- Types ----------

interface TechStack {
  languages?: string[];
  frameworks?: string[];
  databases?: string[];
}

interface RadarItemResponse {
  id: string;
  name: string;
  quadrant: string;
  ring: string;
  description: string | null;
  rationale: string | null;
  isNew: boolean;
  relatedTechnologies: string[];
  inUserStack: boolean;
}

interface RadarItemDetail extends RadarItemResponse {
  relevanceScore: number;
  createdAt: Date;
  updatedAt: Date;
}

interface GroupedRadarItems {
  [quadrant: string]: RadarItemResponse[];
}

// ---------- Service ----------

export class RadarService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get all radar items, optionally with user tech stack overlay.
   */
  async getAllItems(
    userTechStack?: TechStack
  ): Promise<RadarItemResponse[]> {
    const items = await this.prisma.techRadarItem.findMany({
      orderBy: [{ quadrant: 'asc' }, { ring: 'asc' }, { name: 'asc' }],
    });

    const stackTerms = this.flattenTechStack(userTechStack);

    return items.map((item) => this.mapToResponse(item, stackTerms));
  }

  /**
   * Get all items grouped by quadrant.
   */
  async getItemsGroupedByQuadrant(
    userTechStack?: TechStack
  ): Promise<GroupedRadarItems> {
    const items = await this.getAllItems(userTechStack);
    const grouped: GroupedRadarItems = {};

    for (const item of items) {
      if (!grouped[item.quadrant]) {
        grouped[item.quadrant] = [];
      }
      grouped[item.quadrant].push(item);
    }

    return grouped;
  }

  /**
   * Get a single radar item by ID with personalized relevance score.
   */
  async getItemDetail(
    itemId: string,
    userTechStack?: TechStack,
    industry?: string,
    employeeCount?: number
  ): Promise<RadarItemDetail> {
    const item = await this.prisma.techRadarItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw AppError.notFound('Tech radar item not found');
    }

    const stackTerms = this.flattenTechStack(userTechStack);
    const response = this.mapToResponse(item, stackTerms);

    const relevanceScore = this.calculateRelevanceScore(
      item,
      stackTerms,
      industry,
      employeeCount
    );

    return {
      ...response,
      relevanceScore,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  // ---------- Private helpers ----------

  private flattenTechStack(techStack?: TechStack): string[] {
    if (!techStack) return [];

    const terms: string[] = [];
    if (techStack.languages) terms.push(...techStack.languages);
    if (techStack.frameworks) terms.push(...techStack.frameworks);
    if (techStack.databases) terms.push(...techStack.databases);

    return terms.map((t) => t.toLowerCase());
  }

  private mapToResponse(
    item: TechRadarItem,
    stackTerms: string[]
  ): RadarItemResponse {
    const relatedTech = Array.isArray(item.relatedTechnologies)
      ? (item.relatedTechnologies as string[])
      : [];

    const itemNameLower = item.name.toLowerCase();
    const inUserStack = stackTerms.some(
      (term) =>
        itemNameLower.includes(term) ||
        term.includes(itemNameLower) ||
        relatedTech.some(
          (rt) =>
            rt.toLowerCase().includes(term) ||
            term.includes(rt.toLowerCase())
        )
    );

    return {
      id: item.id,
      name: item.name,
      quadrant: item.quadrant,
      ring: item.ring,
      description: item.description,
      rationale: item.rationale,
      isNew: item.isNew,
      relatedTechnologies: relatedTech,
      inUserStack,
    };
  }

  /**
   * Calculate relevance score (0-100) based on:
   * - Tech stack match (60 points max)
   * - Ring proximity (20 points: ADOPT=20, TRIAL=15, ASSESS=10, HOLD=5)
   * - isNew bonus (10 points)
   * - Industry/company size factor (10 points)
   */
  private calculateRelevanceScore(
    item: TechRadarItem,
    stackTerms: string[],
    industry?: string,
    employeeCount?: number
  ): number {
    let score = 0;

    // Tech stack match: 60 points
    const relatedTech = Array.isArray(item.relatedTechnologies)
      ? (item.relatedTechnologies as string[])
      : [];
    const itemNameLower = item.name.toLowerCase();

    // Direct name match: 40 points
    const directMatch = stackTerms.some(
      (term) =>
        itemNameLower.includes(term) || term.includes(itemNameLower)
    );
    if (directMatch) score += 40;

    // Related tech match: 20 points (proportional)
    if (relatedTech.length > 0) {
      const matchCount = relatedTech.filter((rt) =>
        stackTerms.some(
          (term) =>
            rt.toLowerCase().includes(term) ||
            term.includes(rt.toLowerCase())
        )
      ).length;
      score += Math.min(20, Math.round((matchCount / relatedTech.length) * 20));
    }

    // Ring proximity: 20 points
    const ringScores: Record<string, number> = {
      ADOPT: 20,
      TRIAL: 15,
      ASSESS: 10,
      HOLD: 5,
    };
    score += ringScores[item.ring] || 0;

    // isNew bonus: 10 points
    if (item.isNew) score += 10;

    // Industry/size factor: 10 points
    if (industry || employeeCount) {
      score += 5; // Basic bonus for having profile data
      if (
        industry &&
        (industry.toLowerCase().includes('tech') ||
          industry.toLowerCase().includes('software'))
      ) {
        score += 5;
      }
    }

    return Math.min(100, score);
  }
}
