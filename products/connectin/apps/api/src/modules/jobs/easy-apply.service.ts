import { PrismaClient } from '@prisma/client';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from '../../lib/errors';

export class EasyApplyService {
  constructor(private readonly prisma: PrismaClient) {}

  async easyApply(jobId: string, userId: string) {
    // Verify job exists
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, recruiterId: true, status: true },
    });

    if (!job) {
      throw new NotFoundError('Job not found');
    }

    // Recruiter cannot apply to own job
    if (job.recruiterId === userId) {
      throw new ValidationError('Cannot apply to your own job');
    }

    // Check if already applied
    const existing = await this.prisma.jobApplication.findFirst({
      where: { jobId, applicantId: userId },
    });

    if (existing) {
      throw new ConflictError('Already applied to this job');
    }

    const application = await this.prisma.jobApplication.create({
      data: {
        jobId,
        applicantId: userId,
        status: 'PENDING',
      },
    });

    return {
      id: application.id,
      jobId: application.jobId,
      status: application.status,
      appliedAt: application.appliedAt,
    };
  }
}
