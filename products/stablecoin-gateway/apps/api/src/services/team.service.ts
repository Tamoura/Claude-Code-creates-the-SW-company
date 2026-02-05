/**
 * Team Management Service
 *
 * Handles organization CRUD, member management, and role-based
 * access control for team collaboration features.
 */

import { PrismaClient, TeamRole, Organization, TeamMember } from '@prisma/client';
import { AppError } from '../types/index.js';

export interface OrganizationWithMembers extends Organization {
  members: (TeamMember & { user: { id: string; email: string } })[];
}

export interface MembershipWithOrg extends TeamMember {
  organization: Organization;
}

export class TeamService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new organization and add the creator as OWNER.
   */
  async createOrganization(
    userId: string,
    name: string
  ): Promise<OrganizationWithMembers> {
    const org = await this.prisma.organization.create({
      data: {
        name,
        members: {
          create: {
            userId,
            role: TeamRole.OWNER,
          },
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, email: true } },
          },
        },
      },
    });

    return org;
  }

  /**
   * Get organization details with all members.
   * Throws 403 if the requesting user is not a member.
   */
  async getOrganization(
    orgId: string,
    requesterId: string
  ): Promise<OrganizationWithMembers> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        members: {
          include: {
            user: { select: { id: true, email: true } },
          },
        },
      },
    });

    if (!org) {
      throw new AppError(404, 'organization-not-found', 'Organization not found');
    }

    const isMember = org.members.some((m) => m.userId === requesterId);
    if (!isMember) {
      throw new AppError(403, 'not-a-member', 'You are not a member of this organization');
    }

    return org;
  }

  /**
   * List all organizations the user belongs to.
   */
  async listUserOrganizations(userId: string): Promise<MembershipWithOrg[]> {
    const memberships = await this.prisma.teamMember.findMany({
      where: { userId },
      include: { organization: true },
      orderBy: { createdAt: 'desc' },
    });

    return memberships;
  }

  /**
   * Add a member to an organization by email.
   * Only OWNER and ADMIN roles can add members.
   */
  async addMember(
    orgId: string,
    email: string,
    role: TeamRole,
    invitedBy: string
  ): Promise<TeamMember & { user: { id: string; email: string } }> {
    // Verify requester has permission
    await this.requireRole(orgId, invitedBy, [TeamRole.OWNER, TeamRole.ADMIN]);

    // Prevent ADMINs from adding OWNERs
    const requester = await this.getMembership(orgId, invitedBy);
    if (requester.role === TeamRole.ADMIN && role === TeamRole.OWNER) {
      throw new AppError(
        403,
        'insufficient-role',
        'Only owners can add other owners'
      );
    }

    // Find the user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AppError(404, 'user-not-found', 'No user found with that email');
    }

    // Check if user is already a member
    const existing = await this.prisma.teamMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: user.id,
        },
      },
    });

    if (existing) {
      throw new AppError(409, 'already-a-member', 'User is already a member of this organization');
    }

    const member = await this.prisma.teamMember.create({
      data: {
        organizationId: orgId,
        userId: user.id,
        role,
        invitedBy,
      },
      include: {
        user: { select: { id: true, email: true } },
      },
    });

    return member;
  }

  /**
   * Update a member's role.
   * Only OWNER and ADMIN can change roles.
   * Cannot demote the last OWNER.
   */
  async updateMemberRole(
    orgId: string,
    memberId: string,
    role: TeamRole,
    requesterId: string
  ): Promise<TeamMember & { user: { id: string; email: string } }> {
    await this.requireRole(orgId, requesterId, [TeamRole.OWNER, TeamRole.ADMIN]);

    // RISK-084: Wrap owner demotion check + update in a serialized transaction
    // to prevent TOCTOU race where concurrent requests both read ownerCount=2
    // and both demote, leaving zero owners.
    return this.prisma.$transaction(async (tx) => {
      const member = await tx.teamMember.findFirst({
        where: { id: memberId, organizationId: orgId },
      });

      if (!member) {
        throw new AppError(404, 'member-not-found', 'Team member not found');
      }

      // Prevent ADMINs from promoting to OWNER or changing OWNER roles
      const requester = await tx.teamMember.findUnique({
        where: {
          organizationId_userId: { organizationId: orgId, userId: requesterId },
        },
      });
      if (!requester) {
        throw new AppError(403, 'not-a-member', 'You are not a member of this organization');
      }
      if (requester.role === TeamRole.ADMIN) {
        if (role === TeamRole.OWNER || member.role === TeamRole.OWNER) {
          throw new AppError(
            403,
            'insufficient-role',
            'Only owners can modify owner roles'
          );
        }
      }

      // Cannot demote the last OWNER — use FOR UPDATE to serialize concurrent checks
      if (member.role === TeamRole.OWNER && role !== TeamRole.OWNER) {
        const owners = await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM "team_members"
          WHERE "organization_id" = ${orgId} AND role = 'OWNER'::"TeamRole"
          FOR UPDATE
        `;

        if (owners.length <= 1) {
          throw new AppError(
            400,
            'last-owner',
            'Cannot demote the last owner. Transfer ownership first.'
          );
        }
      }

      const updated = await tx.teamMember.update({
        where: { id: memberId },
        data: { role },
        include: {
          user: { select: { id: true, email: true } },
        },
      });

      return updated;
    });
  }

  /**
   * Remove a member from the organization.
   * Only OWNER and ADMIN can remove members.
   * Cannot remove the last OWNER.
   */
  async removeMember(
    orgId: string,
    memberId: string,
    requesterId: string
  ): Promise<void> {
    await this.requireRole(orgId, requesterId, [TeamRole.OWNER, TeamRole.ADMIN]);

    // RISK-084: Serialized transaction to prevent concurrent owner removal
    await this.prisma.$transaction(async (tx) => {
      const member = await tx.teamMember.findFirst({
        where: { id: memberId, organizationId: orgId },
      });

      if (!member) {
        throw new AppError(404, 'member-not-found', 'Team member not found');
      }

      // Prevent ADMINs from removing OWNERs
      const requester = await tx.teamMember.findUnique({
        where: {
          organizationId_userId: { organizationId: orgId, userId: requesterId },
        },
      });
      if (!requester) {
        throw new AppError(403, 'not-a-member', 'You are not a member of this organization');
      }
      if (requester.role === TeamRole.ADMIN && member.role === TeamRole.OWNER) {
        throw new AppError(
          403,
          'insufficient-role',
          'Only owners can remove other owners'
        );
      }

      // Cannot remove the last OWNER — FOR UPDATE serializes concurrent checks
      if (member.role === TeamRole.OWNER) {
        const owners = await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM "team_members"
          WHERE "organization_id" = ${orgId} AND role = 'OWNER'::"TeamRole"
          FOR UPDATE
        `;

        if (owners.length <= 1) {
          throw new AppError(
            400,
            'last-owner',
            'Cannot remove the last owner. Transfer ownership first.'
          );
        }
      }

      await tx.teamMember.delete({
        where: { id: memberId },
      });
    });
  }

  /**
   * Leave an organization voluntarily.
   * The last OWNER cannot leave.
   */
  async leaveOrganization(orgId: string, userId: string): Promise<void> {
    // RISK-084: Serialized transaction to prevent last owner from leaving
    await this.prisma.$transaction(async (tx) => {
      const membership = await tx.teamMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: orgId,
            userId,
          },
        },
      });

      if (!membership) {
        throw new AppError(404, 'not-a-member', 'You are not a member of this organization');
      }

      // Last OWNER cannot leave — FOR UPDATE serializes concurrent checks
      if (membership.role === TeamRole.OWNER) {
        const owners = await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM "team_members"
          WHERE "organization_id" = ${orgId} AND role = 'OWNER'::"TeamRole"
          FOR UPDATE
        `;

        if (owners.length <= 1) {
          throw new AppError(
            400,
            'last-owner',
            'Cannot leave as the last owner. Transfer ownership first.'
          );
        }
      }

      await tx.teamMember.delete({
        where: { id: membership.id },
      });
    });
  }

  // ==================== Private Helpers ====================

  /**
   * Get a user's membership in an organization.
   */
  private async getMembership(
    orgId: string,
    userId: string
  ): Promise<TeamMember> {
    const membership = await this.prisma.teamMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new AppError(403, 'not-a-member', 'You are not a member of this organization');
    }

    return membership;
  }

  /**
   * Verify that a user has one of the required roles in an organization.
   */
  private async requireRole(
    orgId: string,
    userId: string,
    allowedRoles: TeamRole[]
  ): Promise<void> {
    const membership = await this.getMembership(orgId, userId);

    if (!allowedRoles.includes(membership.role)) {
      throw new AppError(
        403,
        'insufficient-role',
        `This action requires one of: ${allowedRoles.join(', ')}`
      );
    }
  }
}
