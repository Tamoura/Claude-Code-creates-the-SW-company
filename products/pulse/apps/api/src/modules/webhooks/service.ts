import * as crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger.js';
import { NotFoundError, UnauthorizedError } from '../../lib/errors.js';

interface PushCommit {
  id: string;
  message: string;
  timestamp: string;
  author: {
    name: string;
    email: string;
    username?: string;
  };
  added: string[];
  removed: string[];
  modified: string[];
}

interface PushEvent {
  ref: string;
  repository: { id: number; full_name: string };
  commits: PushCommit[];
}

interface PullRequestEvent {
  action: string;
  number: number;
  pull_request: {
    id: number;
    number: number;
    title: string;
    state: string;
    user: {
      login: string;
      avatar_url: string;
    };
    additions: number;
    deletions: number;
    commits: number;
    draft: boolean;
    created_at: string;
    updated_at: string;
    merged_at: string | null;
    closed_at: string | null;
    html_url: string;
  };
  repository: { id: number; full_name: string };
}

interface DeploymentEvent {
  action: string;
  deployment: {
    id: number;
    sha: string;
    environment: string;
    description: string | null;
    created_at: string;
    updated_at: string;
  };
  repository: { id: number; full_name: string };
}

export class WebhookService {
  constructor(private prisma: PrismaClient) {}

  verifySignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const expected = `sha256=${hmac.digest('hex')}`;

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expected)
      );
    } catch {
      return false;
    }
  }

  async findRepoByGithubId(githubId: number) {
    const repo = await this.prisma.repository.findFirst({
      where: {
        githubId: BigInt(githubId),
        disconnectedAt: null,
      },
    });

    if (!repo) {
      throw new NotFoundError('Repository not found');
    }

    return repo;
  }

  async processPushEvent(event: PushEvent) {
    const repo = await this.findRepoByGithubId(event.repository.id);
    const branch = event.ref.replace('refs/heads/', '');

    const commitData = event.commits.map((commit) => ({
      repoId: repo.id,
      sha: commit.id,
      message: commit.message,
      authorGithubUsername: commit.author.username ?? null,
      authorEmail: commit.author.email ?? null,
      committedAt: new Date(commit.timestamp),
      additions: commit.added.length + commit.modified.length,
      deletions: commit.removed.length,
      branch,
    }));

    // Upsert each commit (avoid duplicates)
    for (const data of commitData) {
      await this.prisma.commit.upsert({
        where: {
          repoId_sha: { repoId: data.repoId, sha: data.sha },
        },
        create: data,
        update: {
          message: data.message,
          additions: data.additions,
          deletions: data.deletions,
        },
      });
    }

    // Update last activity
    await this.prisma.repository.update({
      where: { id: repo.id },
      data: { lastActivityAt: new Date() },
    });

    logger.info('Processed push event', {
      repoId: repo.id,
      branch,
      commitCount: commitData.length,
    });

    return { status: 'processed', commits: commitData.length };
  }

  async processPullRequestEvent(event: PullRequestEvent) {
    const repo = await this.findRepoByGithubId(event.repository.id);
    const pr = event.pull_request;

    // Map GitHub PR state to our PrState enum
    let state: 'open' | 'closed' | 'merged' = 'open';
    if (pr.merged_at) {
      state = 'merged';
    } else if (pr.state === 'closed') {
      state = 'closed';
    }

    await this.prisma.pullRequest.upsert({
      where: {
        repoId_githubId: {
          repoId: repo.id,
          githubId: BigInt(pr.id),
        },
      },
      create: {
        repoId: repo.id,
        githubId: BigInt(pr.id),
        number: pr.number,
        title: pr.title,
        state,
        authorGithubUsername: pr.user.login,
        authorAvatarUrl: pr.user.avatar_url,
        additions: pr.additions,
        deletions: pr.deletions,
        commitsCount: pr.commits,
        isDraft: pr.draft,
        createdAt: new Date(pr.created_at),
        updatedAt: new Date(pr.updated_at),
        mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
        closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
        url: pr.html_url,
      },
      update: {
        title: pr.title,
        state,
        additions: pr.additions,
        deletions: pr.deletions,
        commitsCount: pr.commits,
        isDraft: pr.draft,
        updatedAt: new Date(pr.updated_at),
        mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
        closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
      },
    });

    // Update last activity
    await this.prisma.repository.update({
      where: { id: repo.id },
      data: { lastActivityAt: new Date() },
    });

    logger.info('Processed pull_request event', {
      repoId: repo.id,
      prNumber: pr.number,
      action: event.action,
    });

    return { status: 'processed', prNumber: pr.number };
  }

  async processDeploymentEvent(event: DeploymentEvent) {
    const repo = await this.findRepoByGithubId(event.repository.id);
    const deploy = event.deployment;

    // Map environment string to our enum
    const validEnvironments = [
      'production',
      'staging',
      'development',
      'preview',
    ];
    const environment = validEnvironments.includes(deploy.environment)
      ? deploy.environment
      : 'production';

    await this.prisma.deployment.upsert({
      where: {
        repoId_githubId: {
          repoId: repo.id,
          githubId: BigInt(deploy.id),
        },
      },
      create: {
        repoId: repo.id,
        githubId: BigInt(deploy.id),
        environment: environment as any,
        status: 'pending',
        commitSha: deploy.sha,
        description: deploy.description,
        createdAt: new Date(deploy.created_at),
        updatedAt: new Date(deploy.updated_at),
      },
      update: {
        description: deploy.description,
        updatedAt: new Date(deploy.updated_at),
      },
    });

    // Update last activity
    await this.prisma.repository.update({
      where: { id: repo.id },
      data: { lastActivityAt: new Date() },
    });

    logger.info('Processed deployment event', {
      repoId: repo.id,
      deploymentId: deploy.id,
      environment: deploy.environment,
    });

    return { status: 'processed', deploymentId: deploy.id };
  }
}
