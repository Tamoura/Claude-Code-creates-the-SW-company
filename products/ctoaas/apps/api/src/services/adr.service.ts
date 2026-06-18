import { PrismaClient, AdrStatus } from '@prisma/client';
import { AppError } from '../lib/errors';

// ---------- Types ----------

interface CreateAdrInput {
  title: string;
  context: string;
  decision: string;
  consequences?: string;
  alternatives?: string;
  mermaidDiagram?: string;
  conversationId?: string;
}

interface UpdateAdrInput {
  title?: string;
  context?: string;
  decision?: string;
  consequences?: string;
  alternatives?: string;
  mermaidDiagram?: string;
}

interface AdrResponse {
  id: string;
  title: string;
  status: string;
  context: string;
  decision: string;
  consequences: string | null;
  alternatives: string | null;
  mermaidDiagram: string | null;
  conversationId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ListResult {
  items: AdrResponse[];
  total: number;
}

// ---------- Valid status transitions ----------

const VALID_TRANSITIONS: Record<string, string[]> = {
  PROPOSED: ['ACCEPTED', 'DEPRECATED'],
  ACCEPTED: ['SUPERSEDED', 'DEPRECATED'],
  DEPRECATED: [],
  SUPERSEDED: [],
};

// ---------- Service ----------

export class AdrService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new ADR scoped to the organization.
   */
  async create(
    organizationId: string,
    input: CreateAdrInput
  ): Promise<AdrResponse> {
    const adr = await this.prisma.architectureDecisionRecord.create({
      data: {
        organizationId,
        title: input.title,
        context: input.context,
        decision: input.decision,
        consequences: input.consequences ?? null,
        alternatives: input.alternatives ?? null,
        mermaidDiagram: input.mermaidDiagram ?? null,
        conversationId: input.conversationId ?? null,
      },
    });

    return this.mapToResponse(adr);
  }

  /**
   * List ADRs for an organization with optional status filter
   * and pagination.
   */
  async list(
    organizationId: string,
    options?: {
      status?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<ListResult> {
    const where: Record<string, unknown> = { organizationId };

    if (options?.status) {
      where.status = options.status as AdrStatus;
    }

    const [items, total] = await Promise.all([
      this.prisma.architectureDecisionRecord.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit,
        skip: options?.offset,
      }),
      this.prisma.architectureDecisionRecord.count({ where }),
    ]);

    return {
      items: items.map((item) => this.mapToResponse(item)),
      total,
    };
  }

  /**
   * Get a single ADR by ID, scoped to the organization.
   */
  async getById(
    adrId: string,
    organizationId: string
  ): Promise<AdrResponse> {
    const adr = await this.prisma.architectureDecisionRecord.findFirst({
      where: { id: adrId, organizationId },
    });

    if (!adr) {
      throw AppError.notFound('ADR not found');
    }

    return this.mapToResponse(adr);
  }

  /**
   * Update ADR fields (title, context, decision, etc.).
   */
  async update(
    adrId: string,
    organizationId: string,
    input: UpdateAdrInput
  ): Promise<AdrResponse> {
    // Verify ownership
    const existing =
      await this.prisma.architectureDecisionRecord.findFirst({
        where: { id: adrId, organizationId },
      });

    if (!existing) {
      throw AppError.notFound('ADR not found');
    }

    const data: Record<string, unknown> = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.context !== undefined) data.context = input.context;
    if (input.decision !== undefined) data.decision = input.decision;
    if (input.consequences !== undefined)
      data.consequences = input.consequences;
    if (input.alternatives !== undefined)
      data.alternatives = input.alternatives;
    if (input.mermaidDiagram !== undefined)
      data.mermaidDiagram = input.mermaidDiagram;

    const updated =
      await this.prisma.architectureDecisionRecord.update({
        where: { id: adrId },
        data,
      });

    return this.mapToResponse(updated);
  }

  /**
   * Transition ADR status with validation.
   */
  async updateStatus(
    adrId: string,
    organizationId: string,
    newStatus: string
  ): Promise<AdrResponse> {
    const existing =
      await this.prisma.architectureDecisionRecord.findFirst({
        where: { id: adrId, organizationId },
      });

    if (!existing) {
      throw AppError.notFound('ADR not found');
    }

    const currentStatus = existing.status;
    const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];

    if (!allowedTransitions.includes(newStatus)) {
      throw AppError.badRequest(
        `Cannot transition from ${currentStatus} to ${newStatus}`
      );
    }

    const updated =
      await this.prisma.architectureDecisionRecord.update({
        where: { id: adrId },
        data: { status: newStatus as AdrStatus },
      });

    return this.mapToResponse(updated);
  }

  /**
   * Soft delete: set status to DEPRECATED.
   */
  async archive(
    adrId: string,
    organizationId: string
  ): Promise<AdrResponse> {
    const existing =
      await this.prisma.architectureDecisionRecord.findFirst({
        where: { id: adrId, organizationId },
      });

    if (!existing) {
      throw AppError.notFound('ADR not found');
    }

    const updated =
      await this.prisma.architectureDecisionRecord.update({
        where: { id: adrId },
        data: { status: 'DEPRECATED' as AdrStatus },
      });

    return this.mapToResponse(updated);
  }

  // ---------- Private ----------

  private mapToResponse(
    adr: {
      id: string;
      title: string;
      status: AdrStatus;
      context: string;
      decision: string;
      consequences: string | null;
      alternatives: string | null;
      mermaidDiagram: string | null;
      conversationId: string | null;
      createdAt: Date;
      updatedAt: Date;
    }
  ): AdrResponse {
    return {
      id: adr.id,
      title: adr.title,
      status: adr.status,
      context: adr.context,
      decision: adr.decision,
      consequences: adr.consequences,
      alternatives: adr.alternatives,
      mermaidDiagram: adr.mermaidDiagram,
      conversationId: adr.conversationId,
      createdAt: adr.createdAt,
      updatedAt: adr.updatedAt,
    };
  }
}
