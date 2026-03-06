/**
 * services/learning-path.service.ts — Learning path generation and management
 *
 * Generates personalized learning paths from fluency profiles.
 * Orders modules by weakest dimension first.
 */

import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/errors.js';

type Dimension = 'DELEGATION' | 'DESCRIPTION' | 'DISCERNMENT' | 'DILIGENCE';

export class LearningPathService {
  constructor(private readonly prisma: PrismaClient) {}

  async createPath(userId: string, orgId: string, profileId: string) {
    // Verify profile exists and belongs to user
    const profile = await this.prisma.fluencyProfile.findFirst({
      where: { id: profileId, userId },
    });

    if (!profile) {
      throw new AppError('profile-not-found', 404, 'Fluency profile not found');
    }

    // Check if path already exists for this profile
    const existing = await this.prisma.learningPath.findFirst({
      where: { profileId },
    });

    if (existing) {
      throw new AppError(
        'path-exists',
        409,
        'Learning path already exists for this profile'
      );
    }

    // Get dimension scores to determine weakness ordering
    const dimScores = profile.dimensionScores as Record<string, number>;
    const dimensions: Dimension[] = ['DELEGATION', 'DESCRIPTION', 'DISCERNMENT', 'DILIGENCE'];

    // Sort dimensions by score ascending (weakest first)
    const sortedDimensions = [...dimensions].sort(
      (a, b) => (dimScores[a] ?? 0) - (dimScores[b] ?? 0)
    );

    // If discernment gap exists, prioritize DISCERNMENT
    if (profile.discernmentGap) {
      const discIdx = sortedDimensions.indexOf('DISCERNMENT');
      if (discIdx > 0) {
        sortedDimensions.splice(discIdx, 1);
        sortedDimensions.unshift('DISCERNMENT');
      }
    }

    // Fetch available learning modules for each dimension
    const modules = await this.prisma.learningModule.findMany({
      where: { isActive: true },
      orderBy: [{ dimension: 'asc' }, { difficulty: 'asc' }],
    });

    // Build ordered module list (weakest dimension first)
    const orderedModules: Array<{ moduleId: string; estimatedMinutes: number }> = [];

    for (const dim of sortedDimensions) {
      const dimModules = modules.filter((m) => m.dimension === dim);
      for (const mod of dimModules) {
        orderedModules.push({ moduleId: mod.id, estimatedMinutes: mod.estimatedMinutes });
      }
    }

    if (orderedModules.length === 0) {
      throw new AppError('no-modules', 400, 'No learning modules available');
    }

    const totalMinutes = orderedModules.reduce((s, m) => s + m.estimatedMinutes, 0);
    const estimatedHours = Math.round((totalMinutes / 60) * 10) / 10;

    // Create learning path with modules
    const path = await this.prisma.learningPath.create({
      data: {
        orgId,
        userId,
        profileId,
        status: 'ACTIVE',
        progressPct: 0,
        estimatedHours,
        modules: {
          create: orderedModules.map((m, idx) => ({
            orgId,
            moduleId: m.moduleId,
            sequence: idx + 1,
            status: 'NOT_STARTED',
          })),
        },
      },
      include: {
        modules: {
          include: {
            module: {
              select: {
                title: true,
                dimension: true,
                contentType: true,
                estimatedMinutes: true,
                difficulty: true,
              },
            },
          },
          orderBy: { sequence: 'asc' },
        },
      },
    });

    return {
      id: path.id,
      status: path.status,
      progressPct: path.progressPct,
      estimatedHours: path.estimatedHours,
      modules: path.modules.map((pm) => ({
        id: pm.id,
        sequence: pm.sequence,
        status: pm.status,
        module: pm.module,
      })),
    };
  }

  async getPath(pathId: string, userId: string) {
    const path = await this.prisma.learningPath.findFirst({
      where: { id: pathId, userId },
      include: {
        modules: {
          include: {
            module: {
              select: {
                title: true,
                dimension: true,
                contentType: true,
                estimatedMinutes: true,
                difficulty: true,
                contentUrl: true,
              },
            },
            completion: true,
          },
          orderBy: { sequence: 'asc' },
        },
      },
    });

    if (!path) {
      throw new AppError('path-not-found', 404, 'Learning path not found');
    }

    return {
      id: path.id,
      status: path.status,
      progressPct: path.progressPct,
      estimatedHours: path.estimatedHours,
      createdAt: path.createdAt,
      modules: path.modules.map((pm) => ({
        id: pm.id,
        sequence: pm.sequence,
        status: pm.status,
        module: pm.module,
        completion: pm.completion,
      })),
    };
  }

  async updateModuleStatus(
    pathId: string,
    pathModuleId: string,
    userId: string,
    orgId: string,
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED'
  ) {
    // Verify path belongs to user
    const path = await this.prisma.learningPath.findFirst({
      where: { id: pathId, userId },
    });

    if (!path) {
      throw new AppError('path-not-found', 404, 'Learning path not found');
    }

    // Verify module belongs to path
    const pathModule = await this.prisma.learningPathModule.findFirst({
      where: { id: pathModuleId, pathId },
    });

    if (!pathModule) {
      throw new AppError('module-not-found', 404, 'Module not found in path');
    }

    // Update module status
    const updated = await this.prisma.learningPathModule.update({
      where: { id: pathModuleId },
      data: { status },
    });

    // If completed, create completion record
    if (status === 'COMPLETED') {
      await this.prisma.moduleCompletion.upsert({
        where: { pathModuleId },
        update: { completedAt: new Date() },
        create: {
          orgId,
          pathModuleId,
          completedAt: new Date(),
        },
      });
    }

    // Recalculate path progress
    const allModules = await this.prisma.learningPathModule.findMany({
      where: { pathId },
    });
    const completedCount = allModules.filter(
      (m) => m.status === 'COMPLETED' || m.status === 'SKIPPED'
    ).length;
    const progressPct = allModules.length > 0
      ? Math.round((completedCount / allModules.length) * 100 * 10) / 10
      : 0;

    // Update path progress and status
    const pathStatus = progressPct >= 100 ? 'COMPLETED' : 'ACTIVE';
    await this.prisma.learningPath.update({
      where: { id: pathId },
      data: { progressPct, status: pathStatus },
    });

    return {
      id: updated.id,
      status: updated.status,
      sequence: updated.sequence,
      pathProgress: progressPct,
    };
  }
}
