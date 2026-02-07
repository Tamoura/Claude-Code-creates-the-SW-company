import { PrismaClient, SyncStatus } from '@prisma/client';
import { logger } from '../../utils/logger.js';
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
} from '../../lib/errors.js';
import { ConnectRepoInput } from './schemas.js';
import { decryptToken, isEncrypted } from '../../utils/encryption.js';

interface ListReposOptions {
  teamId: string;
  page: number;
  limit: number;
  syncStatus?: SyncStatus;
}

interface RepoResponse {
  id: string;
  githubId: string;
  name: string;
  fullName: string;
  organization: string | null;
  language: string | null;
  defaultBranch: string;
  isPrivate: boolean;
  syncStatus: string;
  syncProgress: number;
  syncStartedAt: string | null;
  syncCompletedAt: string | null;
  syncError: string | null;
  lastActivityAt: string | null;
  connectedAt: string;
}

function formatRepo(repo: any): RepoResponse {
  return {
    id: repo.id,
    githubId: repo.githubId.toString(),
    name: repo.name,
    fullName: repo.fullName,
    organization: repo.organization,
    language: repo.language,
    defaultBranch: repo.defaultBranch,
    isPrivate: repo.isPrivate,
    syncStatus: repo.syncStatus,
    syncProgress: repo.syncProgress,
    syncStartedAt: repo.syncStartedAt?.toISOString() ?? null,
    syncCompletedAt: repo.syncCompletedAt?.toISOString() ?? null,
    syncError: repo.syncError,
    lastActivityAt: repo.lastActivityAt?.toISOString() ?? null,
    connectedAt: repo.connectedAt.toISOString(),
  };
}

export class RepoService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Resolve the team ID for a user. Returns the first
   * team membership found, or throws BadRequestError.
   */
  async resolveTeamId(userId: string): Promise<string> {
    const member = await this.prisma.teamMember.findFirst({
      where: { userId },
    });
    if (!member) {
      throw new BadRequestError('User is not a member of any team');
    }
    return member.teamId;
  }

  async listRepos(options: ListReposOptions) {
    const { teamId, page, limit, syncStatus } = options;
    const skip = (page - 1) * limit;

    const where: any = {
      teamId,
      disconnectedAt: null,
    };
    if (syncStatus) {
      where.syncStatus = syncStatus;
    }

    const [repos, total] = await Promise.all([
      this.prisma.repository.findMany({
        where,
        skip,
        take: limit,
        orderBy: { connectedAt: 'desc' },
      }),
      this.prisma.repository.count({ where }),
    ]);

    return {
      data: repos.map(formatRepo),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page < Math.ceil(total / limit),
      },
    };
  }

  async connectRepo(teamId: string, input: ConnectRepoInput) {
    // Check if repo already connected to this team
    const existing = await this.prisma.repository.findFirst({
      where: {
        teamId,
        githubId: input.githubId,
        disconnectedAt: null,
      },
    });

    if (existing) {
      throw new ConflictError(
        'Repository already connected to this team'
      );
    }

    const repo = await this.prisma.repository.create({
      data: {
        teamId,
        githubId: input.githubId,
        name: input.name,
        fullName: input.fullName,
        organization: input.organization ?? null,
        language: input.language ?? null,
        defaultBranch: input.defaultBranch,
        isPrivate: input.isPrivate,
        syncStatus: 'idle',
      },
    });

    logger.info('Repository connected', {
      repoId: repo.id,
      teamId,
      fullName: input.fullName,
    });

    return formatRepo(repo);
  }

  async disconnectRepo(repoId: string, teamId: string) {
    const repo = await this.prisma.repository.findFirst({
      where: {
        id: repoId,
        teamId,
        disconnectedAt: null,
      },
    });

    if (!repo) {
      throw new NotFoundError('Repository not found');
    }

    await this.prisma.repository.update({
      where: { id: repoId },
      data: { disconnectedAt: new Date() },
    });

    logger.info('Repository disconnected', {
      repoId,
      teamId,
      fullName: repo.fullName,
    });

    return { message: 'Repository disconnected' };
  }

  /**
   * Check if a user has a GitHub token stored. Returns the
   * decrypted token if present, or throws BadRequestError if not.
   *
   * Handles migration from plaintext to encrypted tokens:
   * - If the stored value looks encrypted (iv:tag:data hex format),
   *   it is decrypted before returning.
   * - If it is plaintext (legacy/pre-encryption), it is returned as-is.
   */
  async requireGitHubToken(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { githubToken: true },
    });

    if (!user?.githubToken) {
      throw new BadRequestError(
        'GitHub account not connected. Please connect your GitHub account first.'
      );
    }

    // Decrypt if stored encrypted; return as-is for legacy plaintext tokens
    if (isEncrypted(user.githubToken)) {
      try {
        return decryptToken(user.githubToken);
      } catch (error) {
        logger.error('Failed to decrypt GitHub token', error, {
          userId,
        });
        throw new BadRequestError(
          'GitHub token decryption failed. Please reconnect your GitHub account.'
        );
      }
    }

    return user.githubToken;
  }

  async getSyncStatus(repoId: string, teamId: string) {
    const repo = await this.prisma.repository.findFirst({
      where: {
        id: repoId,
        teamId,
        disconnectedAt: null,
      },
    });

    if (!repo) {
      throw new NotFoundError('Repository not found');
    }

    return {
      id: repo.id,
      name: repo.name,
      fullName: repo.fullName,
      syncStatus: repo.syncStatus,
      syncProgress: repo.syncProgress,
      syncStartedAt: repo.syncStartedAt?.toISOString() ?? null,
      syncCompletedAt: repo.syncCompletedAt?.toISOString() ?? null,
      syncError: repo.syncError,
    };
  }
}
