/**
 * Artifact Service
 *
 * Business logic for artifact CRUD and AI generation.
 * Uses OpenRouter to generate structured EA diagrams.
 */

import { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { AppError } from '../../types/index.js';
import { logger } from '../../utils/logger.js';
import { OpenRouterClient } from '../../lib/openrouter.js';
import type {
  AiGenerationResult,
  ArtifactResponse,
  ArtifactListResponse,
  ArtifactListItem,
} from './artifacts.types.js';
import { buildSystemPrompt } from './prompts.js';

export class ArtifactService {
  private aiClient: OpenRouterClient | null;

  constructor(private fastify: FastifyInstance) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    this.aiClient = apiKey
      ? new OpenRouterClient({
          apiKey,
          defaultModel:
            process.env.OPENROUTER_DEFAULT_MODEL ??
            'anthropic/claude-sonnet-4',
          timeoutMs: 60000,
        })
      : null;
  }

  private async audit(
    action: string,
    userId: string,
    resourceId: string | null,
    ip: string,
    userAgent: string,
    metadata: Record<string, unknown> = {},
  ): Promise<void> {
    try {
      await this.fastify.prisma.auditLog.create({
        data: {
          userId,
          resourceId,
          resourceType: 'artifact',
          action,
          metadata,
          ipAddress: ip || null,
          userAgent: userAgent || null,
        },
      });
    } catch (err) {
      logger.error('Failed to write audit log', err);
    }
  }

  private async getWorkspaceId(userId: string): Promise<string> {
    const membership =
      await this.fastify.prisma.workspaceMember.findFirst({
        where: { userId, role: 'owner' },
        select: { workspaceId: true },
      });

    if (!membership) {
      throw new AppError(403, 'forbidden', 'User has no workspace');
    }

    return membership.workspaceId;
  }

  private async verifyProjectAccess(
    userId: string,
    projectId: string,
  ): Promise<void> {
    const workspaceId = await this.getWorkspaceId(userId);

    const project = await this.fastify.prisma.project.findFirst({
      where: { id: projectId, workspaceId },
    });

    if (!project) {
      throw new AppError(404, 'not-found', 'Project not found');
    }
  }

  private formatArtifact(
    artifact: Prisma.ArtifactGetPayload<{
      include: {
        creator: true;
        elements: true;
        relationships: true;
      };
    }>,
  ): ArtifactResponse {
    return {
      id: artifact.id,
      projectId: artifact.projectId,
      name: artifact.name,
      type: artifact.type,
      framework: artifact.framework,
      status: artifact.status,
      svgContent: artifact.svgContent,
      nlDescription: artifact.nlDescription,
      currentVersion: artifact.currentVersion,
      createdBy: {
        id: artifact.creator.id,
        email: artifact.creator.email,
        fullName: artifact.creator.fullName,
      },
      elements: artifact.elements.map((el) => ({
        id: el.id,
        elementId: el.elementId,
        elementType: el.elementType,
        name: el.name,
        description: el.description,
        properties: el.properties,
        position: el.position,
        layer: el.layer,
      })),
      relationships: artifact.relationships.map((rel) => ({
        id: rel.id,
        relationshipId: rel.relationshipId,
        sourceElementId: rel.sourceElementId,
        targetElementId: rel.targetElementId,
        relationshipType: rel.relationshipType,
        label: rel.label,
      })),
      createdAt: artifact.createdAt.toISOString(),
      updatedAt: artifact.updatedAt.toISOString(),
    };
  }

  private async callAi(
    framework: string,
    type: string,
    prompt: string,
  ): Promise<AiGenerationResult> {
    // Check for mock response (test/dev only)
    if (
      process.env.AI_MOCK_RESPONSE &&
      process.env.NODE_ENV !== 'production'
    ) {
      return JSON.parse(
        process.env.AI_MOCK_RESPONSE,
      ) as AiGenerationResult;
    }

    if (!this.aiClient) {
      throw new AppError(
        503,
        'service-unavailable',
        'AI service not configured (missing OPENROUTER_API_KEY)',
      );
    }

    const systemPrompt = buildSystemPrompt(framework, type);

    const response = await this.aiClient.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      { maxTokens: 4000, temperature: 0.7 },
    );

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new AppError(
        502,
        'ai-error',
        'AI returned an empty response',
      );
    }

    // Extract JSON from possibly markdown-wrapped response
    const jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();

    try {
      return JSON.parse(jsonStr) as AiGenerationResult;
    } catch {
      throw new AppError(
        502,
        'ai-error',
        'AI returned invalid JSON',
      );
    }
  }

  async generate(
    userId: string,
    projectId: string,
    data: {
      prompt: string;
      type: string;
      framework: string;
      templateId?: string;
    },
    ip: string,
    userAgent: string,
  ): Promise<ArtifactResponse> {
    await this.verifyProjectAccess(userId, projectId);

    const aiResult = await this.callAi(
      data.framework,
      data.type,
      data.prompt,
    );

    const artifact = await this.fastify.prisma.$transaction(
      async (tx) => {
        const art = await tx.artifact.create({
          data: {
            projectId,
            createdBy: userId,
            name: aiResult.name,
            type: data.type,
            framework: data.framework,
            status: 'draft',
            svgContent: aiResult.mermaidDiagram || null,
            nlDescription: data.prompt,
            currentVersion: 1,
            canvasData: {
              elements: aiResult.elements,
              relationships: aiResult.relationships,
              viewport: { x: 0, y: 0, zoom: 1 },
            },
          },
        });

        // Create version snapshot
        await tx.artifactVersion.create({
          data: {
            artifactId: art.id,
            createdBy: userId,
            versionNumber: 1,
            canvasData: {
              elements: aiResult.elements,
              relationships: aiResult.relationships,
              viewport: { x: 0, y: 0, zoom: 1 },
            },
            svgContent: aiResult.mermaidDiagram || null,
            changeSummary: 'Initial AI generation',
            changeType: 'ai_generation',
          },
        });

        // Create elements
        if (aiResult.elements.length > 0) {
          await tx.artifactElement.createMany({
            data: aiResult.elements.map((el) => ({
              artifactId: art.id,
              elementId: el.elementId,
              elementType: el.elementType,
              framework: data.framework,
              name: el.name,
              description: el.description || null,
              properties: (el.properties as Prisma.InputJsonValue) ?? {},
              position: (el.position as Prisma.InputJsonValue) ?? {
                x: 0,
                y: 0,
                width: 200,
                height: 100,
              },
              layer: el.layer || null,
            })),
          });
        }

        // Create relationships
        if (aiResult.relationships.length > 0) {
          await tx.artifactRelationship.createMany({
            data: aiResult.relationships.map((rel) => ({
              artifactId: art.id,
              relationshipId: rel.relationshipId,
              sourceElementId: rel.sourceElementId,
              targetElementId: rel.targetElementId,
              relationshipType: rel.relationshipType,
              framework: data.framework,
              label: rel.label || null,
            })),
          });
        }

        return tx.artifact.findUniqueOrThrow({
          where: { id: art.id },
          include: {
            creator: true,
            elements: true,
            relationships: true,
          },
        });
      },
    );

    logger.info('Artifact generated via AI', {
      artifactId: artifact.id,
      projectId,
      userId,
    });
    await this.audit(
      'artifact.generate',
      userId,
      artifact.id,
      ip,
      userAgent,
      {
        framework: data.framework,
        type: data.type,
        elementCount: aiResult.elements.length,
        relationshipCount: aiResult.relationships.length,
      },
    );

    return this.formatArtifact(artifact);
  }

  async list(
    userId: string,
    projectId: string,
    query: {
      search?: string;
      framework: string;
      type?: string;
      status: string;
      cursor?: string;
      pageSize: number;
    },
  ): Promise<ArtifactListResponse> {
    await this.verifyProjectAccess(userId, projectId);

    const where: Prisma.ArtifactWhereInput = { projectId };

    if (query.framework !== 'all') {
      where.framework = query.framework;
    }
    if (query.type) {
      where.type = query.type;
    }
    if (query.status !== 'all') {
      where.status = query.status;
    }
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    const total = await this.fastify.prisma.artifact.count({
      where,
    });

    const findArgs: Prisma.ArtifactFindManyArgs = {
      where,
      include: {
        creator: true,
        _count: { select: { elements: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: query.pageSize + 1,
    };

    if (query.cursor) {
      findArgs.cursor = { id: query.cursor };
      findArgs.skip = 1;
    }

    const artifacts =
      await this.fastify.prisma.artifact.findMany(findArgs);

    const hasMore = artifacts.length > query.pageSize;
    const items = artifacts.slice(0, query.pageSize);
    const nextCursor = hasMore
      ? items[items.length - 1].id
      : null;

    type ArtifactWithCreatorAndCount = Prisma.ArtifactGetPayload<{
      include: { creator: true; _count: { select: { elements: true } } };
    }>;

    const data: ArtifactListItem[] = (items as ArtifactWithCreatorAndCount[]).map(
      (a) => ({
        id: a.id,
        projectId: a.projectId,
        name: a.name,
        type: a.type,
        framework: a.framework,
        status: a.status,
        currentVersion: a.currentVersion,
        elementCount: a._count.elements,
        createdBy: {
          id: a.creator.id,
          email: a.creator.email,
          fullName: a.creator.fullName,
        },
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      }),
    );

    return {
      data,
      meta: { total, pageSize: query.pageSize, hasMore, nextCursor },
    };
  }

  async getById(
    userId: string,
    projectId: string,
    artifactId: string,
  ): Promise<ArtifactResponse> {
    await this.verifyProjectAccess(userId, projectId);

    const artifact = await this.fastify.prisma.artifact.findFirst({
      where: { id: artifactId, projectId },
      include: {
        creator: true,
        elements: true,
        relationships: true,
      },
    });

    if (!artifact) {
      throw new AppError(404, 'not-found', 'Artifact not found');
    }

    return this.formatArtifact(artifact);
  }

  async update(
    userId: string,
    projectId: string,
    artifactId: string,
    data: {
      name?: string;
      description?: string | null;
      canvasData?: Record<string, unknown>;
    },
    ip: string,
    userAgent: string,
  ): Promise<ArtifactResponse> {
    await this.verifyProjectAccess(userId, projectId);

    const existing = await this.fastify.prisma.artifact.findFirst({
      where: { id: artifactId, projectId },
    });

    if (!existing) {
      throw new AppError(404, 'not-found', 'Artifact not found');
    }

    const updateData: Prisma.ArtifactUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined)
      updateData.nlDescription = data.description;
    if (data.canvasData !== undefined)
      updateData.canvasData = data.canvasData as Prisma.InputJsonValue;

    const artifact = await this.fastify.prisma.artifact.update({
      where: { id: artifactId },
      data: updateData,
      include: {
        creator: true,
        elements: true,
        relationships: true,
      },
    });

    logger.info('Artifact updated', { artifactId, userId });
    await this.audit(
      'artifact.update',
      userId,
      artifactId,
      ip,
      userAgent,
      { changes: Object.keys(data) },
    );

    return this.formatArtifact(artifact);
  }

  async delete(
    userId: string,
    projectId: string,
    artifactId: string,
    ip: string,
    userAgent: string,
  ): Promise<void> {
    await this.verifyProjectAccess(userId, projectId);

    const existing = await this.fastify.prisma.artifact.findFirst({
      where: { id: artifactId, projectId },
    });

    if (!existing) {
      throw new AppError(404, 'not-found', 'Artifact not found');
    }

    await this.fastify.prisma.artifact.delete({
      where: { id: artifactId },
    });

    logger.info('Artifact deleted', { artifactId, userId });
    await this.audit(
      'artifact.delete',
      userId,
      artifactId,
      ip,
      userAgent,
      { name: existing.name },
    );
  }

  async regenerate(
    userId: string,
    projectId: string,
    artifactId: string,
    prompt: string,
    ip: string,
    userAgent: string,
  ): Promise<ArtifactResponse> {
    await this.verifyProjectAccess(userId, projectId);

    const existing = await this.fastify.prisma.artifact.findFirst({
      where: { id: artifactId, projectId },
    });

    if (!existing) {
      throw new AppError(404, 'not-found', 'Artifact not found');
    }

    const aiResult = await this.callAi(
      existing.framework,
      existing.type,
      prompt,
    );

    const newVersion = existing.currentVersion + 1;

    const artifact = await this.fastify.prisma.$transaction(
      async (tx) => {
        // Delete old elements and relationships
        await tx.artifactElement.deleteMany({
          where: { artifactId },
        });
        await tx.artifactRelationship.deleteMany({
          where: { artifactId },
        });

        // Update artifact
        await tx.artifact.update({
          where: { id: artifactId },
          data: {
            name: aiResult.name,
            svgContent: aiResult.mermaidDiagram || null,
            nlDescription: prompt,
            currentVersion: newVersion,
            canvasData: {
              elements: aiResult.elements,
              relationships: aiResult.relationships,
              viewport: { x: 0, y: 0, zoom: 1 },
            },
          },
        });

        // Create version
        await tx.artifactVersion.create({
          data: {
            artifactId,
            createdBy: userId,
            versionNumber: newVersion,
            canvasData: {
              elements: aiResult.elements,
              relationships: aiResult.relationships,
              viewport: { x: 0, y: 0, zoom: 1 },
            },
            svgContent: aiResult.mermaidDiagram || null,
            changeSummary: `AI regeneration v${newVersion}`,
            changeType: 'ai_generation',
          },
        });

        // Create elements
        if (aiResult.elements.length > 0) {
          await tx.artifactElement.createMany({
            data: aiResult.elements.map((el) => ({
              artifactId,
              elementId: el.elementId,
              elementType: el.elementType,
              framework: existing.framework,
              name: el.name,
              description: el.description || null,
              properties: (el.properties as Prisma.InputJsonValue) ?? {},
              position: (el.position as Prisma.InputJsonValue) ?? {
                x: 0,
                y: 0,
                width: 200,
                height: 100,
              },
              layer: el.layer || null,
            })),
          });
        }

        // Create relationships
        if (aiResult.relationships.length > 0) {
          await tx.artifactRelationship.createMany({
            data: aiResult.relationships.map((rel) => ({
              artifactId,
              relationshipId: rel.relationshipId,
              sourceElementId: rel.sourceElementId,
              targetElementId: rel.targetElementId,
              relationshipType: rel.relationshipType,
              framework: existing.framework,
              label: rel.label || null,
            })),
          });
        }

        return tx.artifact.findUniqueOrThrow({
          where: { id: artifactId },
          include: {
            creator: true,
            elements: true,
            relationships: true,
          },
        });
      },
    );

    logger.info('Artifact regenerated', {
      artifactId,
      version: newVersion,
      userId,
    });
    await this.audit(
      'artifact.regenerate',
      userId,
      artifactId,
      ip,
      userAgent,
      { version: newVersion, prompt },
    );

    return this.formatArtifact(artifact);
  }
}
