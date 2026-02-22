import {
  PrismaClient,
  WorkType,
  ExperienceLevel,
  JobStatus,
} from '@prisma/client';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '../../lib/errors';
import {
  decodeCursor,
  encodeCursor,
  CursorPaginationMeta,
} from '../../lib/pagination';
import {
  CreateJobInput,
  UpdateJobInput,
  ApplyJobInput,
  JobQueryInput,
} from './jobs.schemas';

export class JobsService {
  constructor(private readonly prisma: PrismaClient) {}

  // ─── Create Job ────────────────────────────────────────────

  async createJob(recruiterId: string, input: CreateJobInput) {
    const job = await this.prisma.job.create({
      data: {
        recruiterId,
        title: input.title,
        company: input.company,
        location: input.location,
        workType: input.workType as WorkType,
        experienceLevel: input.experienceLevel as ExperienceLevel,
        description: input.description,
        requirements: input.requirements,
        salaryMin: input.salaryMin,
        salaryMax: input.salaryMax,
        salaryCurrency: input.salaryCurrency ?? 'USD',
        language: input.language,
        status: JobStatus.OPEN,
      },
    });

    return this.formatJob(job);
  }

  // ─── Search / List Jobs ────────────────────────────────────

  async searchJobs(query: JobQueryInput) {
    const limit = Math.min(
      50,
      Math.max(1, parseInt(query.limit || '10', 10) || 10)
    );

    const cursorData = query.cursor
      ? decodeCursor(query.cursor)
      : null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = { status: JobStatus.OPEN };

    if (query.workType) {
      where.workType = query.workType as WorkType;
    }

    if (query.experienceLevel) {
      where.experienceLevel = query.experienceLevel as ExperienceLevel;
    }

    if (query.location) {
      where.location = {
        contains: query.location,
        mode: 'insensitive',
      };
    }

    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { company: { contains: query.q, mode: 'insensitive' } },
        {
          description: {
            contains: query.q,
            mode: 'insensitive',
          },
        },
      ];
    }

    if (cursorData) {
      // Cursor pagination: fetch records older than the cursor
      where.createdAt = { lt: cursorData.createdAt };
    }

    const jobs = await this.prisma.job.findMany({
      where,
      take: limit + 1,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    const hasMore = jobs.length > limit;
    const resultJobs = hasMore ? jobs.slice(0, limit) : jobs;

    const lastJob =
      resultJobs.length > 0
        ? resultJobs[resultJobs.length - 1]
        : null;

    const meta: CursorPaginationMeta = {
      cursor: lastJob
        ? encodeCursor(lastJob.createdAt, lastJob.id)
        : null,
      hasMore,
      count: resultJobs.length,
    };

    return { data: resultJobs.map(this.formatJob), meta };
  }

  // ─── Get Job By ID ─────────────────────────────────────────

  async getJobById(id: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
    });

    if (!job) {
      throw new NotFoundError('Job not found');
    }

    return this.formatJob(job);
  }

  // ─── Update Job ────────────────────────────────────────────

  async updateJob(
    id: string,
    userId: string,
    input: UpdateJobInput
  ) {
    const job = await this.prisma.job.findUnique({
      where: { id },
    });

    if (!job) {
      throw new NotFoundError('Job not found');
    }

    if (job.recruiterId !== userId) {
      throw new ForbiddenError(
        'Only the job owner can update this job'
      );
    }

    const updated = await this.prisma.job.update({
      where: { id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.company !== undefined && {
          company: input.company,
        }),
        ...(input.location !== undefined && {
          location: input.location,
        }),
        ...(input.workType !== undefined && {
          workType: input.workType as WorkType,
        }),
        ...(input.experienceLevel !== undefined && {
          experienceLevel: input.experienceLevel as ExperienceLevel,
        }),
        ...(input.description !== undefined && {
          description: input.description,
        }),
        ...(input.requirements !== undefined && {
          requirements: input.requirements,
        }),
        ...(input.salaryMin !== undefined && {
          salaryMin: input.salaryMin,
        }),
        ...(input.salaryMax !== undefined && {
          salaryMax: input.salaryMax,
        }),
        ...(input.salaryCurrency !== undefined && {
          salaryCurrency: input.salaryCurrency,
        }),
        ...(input.language !== undefined && {
          language: input.language,
        }),
        ...(input.status !== undefined && {
          status: input.status as JobStatus,
        }),
      },
    });

    return this.formatJob(updated);
  }

  // ─── Archive Job ───────────────────────────────────────────

  async archiveJob(id: string, userId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
    });

    if (!job) {
      throw new NotFoundError('Job not found');
    }

    if (job.recruiterId !== userId) {
      throw new ForbiddenError(
        'Only the job owner can archive this job'
      );
    }

    const archived = await this.prisma.job.update({
      where: { id },
      data: { status: JobStatus.ARCHIVED },
    });

    return this.formatJob(archived);
  }

  // ─── Apply to Job ──────────────────────────────────────────

  async applyToJob(
    jobId: string,
    applicantId: string,
    input: ApplyJobInput
  ) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job || job.status !== JobStatus.OPEN) {
      throw new NotFoundError('Job not found or not open');
    }

    // Check for duplicate application (FR-505)
    const existingApp =
      await this.prisma.jobApplication.findUnique({
        where: {
          jobId_applicantId: { jobId, applicantId },
        },
      });

    if (existingApp) {
      throw new ConflictError(
        'You have already applied to this job'
      );
    }

    const [application] = await this.prisma.$transaction([
      this.prisma.jobApplication.create({
        data: {
          jobId,
          applicantId,
          coverNote: input.coverNote ?? null,
        },
      }),
      this.prisma.job.update({
        where: { id: jobId },
        data: { applicantCount: { increment: 1 } },
      }),
    ]);

    return {
      id: application.id,
      jobId: application.jobId,
      applicantId: application.applicantId,
      coverNote: application.coverNote,
      status: application.status,
      appliedAt: application.appliedAt,
    };
  }

  // ─── List Applications (recruiter) ────────────────────────

  async listApplications(jobId: string, recruiterId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundError('Job not found');
    }

    if (job.recruiterId !== recruiterId) {
      throw new ForbiddenError(
        'Only the job owner can view applications'
      );
    }

    const applications =
      await this.prisma.jobApplication.findMany({
        where: { jobId },
        include: {
          applicant: {
            select: {
              id: true,
              displayName: true,
              profile: {
                select: {
                  avatarUrl: true,
                  headlineEn: true,
                },
              },
            },
          },
        },
        orderBy: { appliedAt: 'desc' },
      });

    return applications.map((app) => ({
      id: app.id,
      jobId: app.jobId,
      applicantId: app.applicantId,
      applicant: {
        id: app.applicant.id,
        displayName: app.applicant.displayName,
        avatarUrl: app.applicant.profile?.avatarUrl ?? null,
        headlineEn: app.applicant.profile?.headlineEn ?? null,
      },
      coverNote: app.coverNote,
      status: app.status,
      appliedAt: app.appliedAt,
    }));
  }

  // ─── Withdraw Application ──────────────────────────────────

  async withdrawApplication(
    jobId: string,
    applicationId: string,
    userId: string
  ) {
    const application =
      await this.prisma.jobApplication.findUnique({
        where: { id: applicationId },
      });

    if (!application || application.jobId !== jobId) {
      throw new NotFoundError('Application not found');
    }

    if (application.applicantId !== userId) {
      throw new ForbiddenError(
        'Only the applicant can withdraw this application'
      );
    }

    const withdrawn = await this.prisma.jobApplication.update({
      where: { id: applicationId },
      data: { status: 'WITHDRAWN' },
    });

    return {
      id: withdrawn.id,
      jobId: withdrawn.jobId,
      applicantId: withdrawn.applicantId,
      status: withdrawn.status,
      updatedAt: withdrawn.updatedAt,
    };
  }

  // ─── Save Job ──────────────────────────────────────────────

  async saveJob(jobId: string, userId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundError('Job not found');
    }

    const existing = await this.prisma.savedJob.findUnique({
      where: { jobId_userId: { jobId, userId } },
    });

    if (existing) {
      return { saved: true, alreadySaved: true };
    }

    await this.prisma.savedJob.create({
      data: { jobId, userId },
    });

    return { saved: true, alreadySaved: false };
  }

  // ─── Unsave Job ────────────────────────────────────────────

  async unsaveJob(jobId: string, userId: string) {
    const existing = await this.prisma.savedJob.findUnique({
      where: { jobId_userId: { jobId, userId } },
    });

    if (!existing) {
      return { saved: false };
    }

    await this.prisma.savedJob.delete({
      where: { id: existing.id },
    });

    return { saved: false };
  }

  // ─── List Saved Jobs (paginated) ───────────────────────────

  async listSavedJobs(
    userId: string,
    options?: { cursor?: string; limit?: number }
  ) {
    const limit = Math.min(
      50,
      Math.max(1, options?.limit ?? 20)
    );

    const cursorData = options?.cursor
      ? decodeCursor(options.cursor)
      : null;

    const where: {
      userId: string;
      savedAt?: { lt: Date };
    } = { userId };

    if (cursorData) {
      where.savedAt = { lt: cursorData.createdAt };
    }

    const saved = await this.prisma.savedJob.findMany({
      where,
      take: limit + 1,
      include: {
        job: true,
      },
      orderBy: [{ savedAt: 'desc' }, { id: 'desc' }],
    });

    const hasMore = saved.length > limit;
    const resultSaved = hasMore ? saved.slice(0, limit) : saved;

    const lastItem =
      resultSaved.length > 0
        ? resultSaved[resultSaved.length - 1]
        : null;

    const meta: CursorPaginationMeta = {
      cursor: lastItem
        ? encodeCursor(lastItem.savedAt, lastItem.id)
        : null,
      hasMore,
      count: resultSaved.length,
    };

    return {
      data: resultSaved.map((s) => ({
        savedAt: s.savedAt,
        job: this.formatJob(s.job),
      })),
      meta,
    };
  }

  // ─── Format Helper ─────────────────────────────────────────

  private formatJob(job: {
    id: string;
    recruiterId: string;
    title: string;
    company: string;
    location: string | null;
    workType: WorkType;
    experienceLevel: ExperienceLevel;
    description: string;
    requirements: string | null;
    salaryMin: { toNumber(): number } | number | null;
    salaryMax: { toNumber(): number } | number | null;
    salaryCurrency: string | null;
    language: string;
    status: JobStatus;
    applicantCount: number;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: job.id,
      recruiterId: job.recruiterId,
      title: job.title,
      company: job.company,
      location: job.location,
      workType: job.workType,
      experienceLevel: job.experienceLevel,
      description: job.description,
      requirements: job.requirements,
      salaryMin: job.salaryMin != null
        ? (typeof job.salaryMin === 'object' && 'toNumber' in job.salaryMin
            ? job.salaryMin.toNumber()
            : Number(job.salaryMin))
        : null,
      salaryMax: job.salaryMax != null
        ? (typeof job.salaryMax === 'object' && 'toNumber' in job.salaryMax
            ? job.salaryMax.toNumber()
            : Number(job.salaryMax))
        : null,
      salaryCurrency: job.salaryCurrency,
      language: job.language,
      status: job.status,
      applicantCount: job.applicantCount,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }
}
