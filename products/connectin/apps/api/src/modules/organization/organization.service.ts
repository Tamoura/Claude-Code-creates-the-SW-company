import {
  PrismaClient,
  OrgMemberRole,
  JobStatus,
} from '@prisma/client';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '../../lib/errors';

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  description?: string;
  industry?: string;
  size?: string;
  headquarters?: string;
  website?: string;
  foundedYear?: number;
}

export interface UpdateOrganizationInput {
  description?: string;
  industry?: string;
  size?: string;
  headquarters?: string;
  website?: string;
  foundedYear?: number;
}

export interface AddMemberInput {
  userId: string;
  role: string;
}

export class OrganizationService {
  constructor(private readonly prisma: PrismaClient) {}

  // ─── Create Organization ───────────────────────────────────

  async createOrganization(
    userId: string,
    input: CreateOrganizationInput
  ) {
    const existing = await this.prisma.organization.findUnique({
      where: { slug: input.slug },
    });

    if (existing) {
      throw new ConflictError(
        `Slug "${input.slug}" is already taken`
      );
    }

    const org = await this.prisma.organization.create({
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
        industry: input.industry ?? null,
        size: input.size as
          | 'STARTUP'
          | 'SMALL'
          | 'MEDIUM'
          | 'LARGE'
          | 'ENTERPRISE'
          | undefined,
        headquarters: input.headquarters ?? null,
        website: input.website ?? null,
        foundedYear: input.foundedYear ?? null,
        members: {
          create: {
            userId,
            role: OrgMemberRole.ADMIN,
          },
        },
      },
    });

    return org;
  }

  // ─── Get Organization ──────────────────────────────────────

  async getOrganization(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            members: true,
            followers: true,
          },
        },
      },
    });

    if (!org) {
      throw new NotFoundError('Organization not found');
    }

    return {
      ...org,
      memberCount: org._count.members,
      followerCount: org._count.followers,
      _count: undefined,
    };
  }

  // ─── Update Organization ───────────────────────────────────

  async updateOrganization(
    orgId: string,
    userId: string,
    input: UpdateOrganizationInput
  ) {
    await this.requireAdmin(orgId, userId);

    const updated = await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        ...(input.description !== undefined && {
          description: input.description,
        }),
        ...(input.industry !== undefined && {
          industry: input.industry,
        }),
        ...(input.size !== undefined && {
          size: input.size as
            | 'STARTUP'
            | 'SMALL'
            | 'MEDIUM'
            | 'LARGE'
            | 'ENTERPRISE',
        }),
        ...(input.headquarters !== undefined && {
          headquarters: input.headquarters,
        }),
        ...(input.website !== undefined && {
          website: input.website,
        }),
        ...(input.foundedYear !== undefined && {
          foundedYear: input.foundedYear,
        }),
      },
    });

    return updated;
  }

  // ─── Follow Organization ───────────────────────────────────

  async followOrganization(orgId: string, userId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw new NotFoundError('Organization not found');
    }

    await this.prisma.orgFollower.upsert({
      where: {
        organizationId_userId: { organizationId: orgId, userId },
      },
      create: { organizationId: orgId, userId },
      update: {},
    });

    return { following: true };
  }

  // ─── Unfollow Organization ─────────────────────────────────

  async unfollowOrganization(orgId: string, userId: string) {
    await this.prisma.orgFollower.deleteMany({
      where: { organizationId: orgId, userId },
    });

    return { following: false };
  }

  // ─── List Followers ────────────────────────────────────────

  async listFollowers(
    orgId: string,
    limit: number,
    offset: number
  ) {
    const followers = await this.prisma.orgFollower.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return followers.map((f) => ({
      id: f.user.id,
      displayName: f.user.displayName,
      followedAt: f.createdAt,
    }));
  }

  // ─── Add Member ────────────────────────────────────────────

  async addMember(
    orgId: string,
    requesterId: string,
    targetUserId: string,
    role: string
  ) {
    await this.requireAdmin(orgId, requesterId);

    const member = await this.prisma.orgMember.create({
      data: {
        organizationId: orgId,
        userId: targetUserId,
        role: role as OrgMemberRole,
      },
    });

    return member;
  }

  // ─── Remove Member ─────────────────────────────────────────

  async removeMember(
    orgId: string,
    requesterId: string,
    targetUserId: string
  ) {
    await this.requireAdmin(orgId, requesterId);

    await this.prisma.orgMember.deleteMany({
      where: { organizationId: orgId, userId: targetUserId },
    });

    return { removed: true };
  }

  // ─── List Members ──────────────────────────────────────────

  async listMembers(orgId: string) {
    const members = await this.prisma.orgMember.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return members.map((m) => ({
      id: m.user.id,
      displayName: m.user.displayName,
      role: m.role,
      joinedAt: m.createdAt,
    }));
  }

  // ─── List Organization Jobs ────────────────────────────────

  async listOrganizationJobs(
    orgId: string,
    limit: number,
    offset: number
  ) {
    const jobs = await this.prisma.job.findMany({
      where: {
        organizationId: orgId,
        status: JobStatus.OPEN,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return jobs;
  }

  // ─── List All Organizations ────────────────────────────────

  async listOrganizations(_userId: string) {
    const organizations = await this.prisma.organization.findMany({
      include: {
        _count: {
          select: {
            members: true,
            followers: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return organizations;
  }

  // ─── Private Helpers ───────────────────────────────────────

  private async requireAdmin(
    orgId: string,
    userId: string
  ): Promise<void> {
    const membership = await this.prisma.orgMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
    });

    if (!membership || membership.role !== OrgMemberRole.ADMIN) {
      throw new ForbiddenError(
        'Only organization admins can perform this action'
      );
    }
  }
}
