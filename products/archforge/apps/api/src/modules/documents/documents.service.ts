/**
 * Document Ingestion Service
 *
 * Business logic for document upload, AI-powered concept
 * extraction, and artifact generation from documents.
 */

import { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { AppError } from '../../types/index.js';
import { logger } from '../../utils/logger.js';
import { OpenRouterClient } from '../../lib/openrouter.js';
import type {
  ExtractionResult,
  DocumentResponse,
  DocumentListResponse,
} from './documents.types.js';

const EXTRACTION_SYSTEM_PROMPT = `You are an enterprise architecture analyst. Analyze the provided document and extract architecture concepts.

You MUST respond with ONLY valid JSON (no markdown, no explanation).
The JSON must follow this exact structure:

{
  "entities": [
    { "name": "string", "type": "system|service|database|user|component|process|interface|layer", "description": "string" }
  ],
  "relationships": [
    { "source": "string - entity name", "target": "string - entity name", "type": "uses|depends_on|communicates_with|stores_data_in|serves|triggers|reads_from|writes_to", "description": "string" }
  ],
  "technologies": ["PostgreSQL", "Redis", "..."],
  "patterns": ["microservices", "event-driven", "..."]
}

Extract between 2-15 entities, relevant relationships between them, technologies mentioned, and architectural patterns identified. Be thorough but precise.`;

export class DocumentService {
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
          resourceType: 'document',
          action,
          metadata: metadata as Prisma.InputJsonValue,
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

  private formatDocument(
    doc: Prisma.DocumentUploadGetPayload<{
      include: { uploader: true };
    }>,
  ): DocumentResponse {
    return {
      id: doc.id,
      projectId: doc.projectId,
      originalFilename: doc.originalFilename,
      fileType: doc.fileType,
      fileSizeBytes: doc.fileSizeBytes,
      processingStatus: doc.processingStatus,
      extractionResult: doc.extractionResult as ExtractionResult | null,
      errorMessage: doc.errorMessage,
      uploadedBy: {
        id: doc.uploader.id,
        email: doc.uploader.email,
        fullName: doc.uploader.fullName,
      },
      createdAt: doc.createdAt.toISOString(),
      processedAt: doc.processedAt?.toISOString() ?? null,
    };
  }

  private async extractConcepts(
    content: string,
  ): Promise<ExtractionResult> {
    // Check for mock response (test/dev only)
    if (
      process.env.AI_MOCK_RESPONSE &&
      process.env.NODE_ENV !== 'production'
    ) {
      const mock = JSON.parse(process.env.AI_MOCK_RESPONSE);
      return { ...mock, originalContent: content };
    }

    if (!this.aiClient) {
      throw new AppError(
        503,
        'service-unavailable',
        'AI service not configured (missing OPENROUTER_API_KEY)',
      );
    }

    const response = await this.aiClient.chat(
      [
        { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
        { role: 'user', content },
      ],
      { maxTokens: 4000, temperature: 0.3 },
    );

    const responseContent = response.choices[0]?.message?.content;
    if (!responseContent) {
      throw new AppError(
        502,
        'ai-error',
        'AI returned an empty response',
      );
    }

    const jsonMatch = responseContent.match(
      /```json\s*([\s\S]*?)```/,
    );
    const jsonStr = jsonMatch
      ? jsonMatch[1].trim()
      : responseContent.trim();

    try {
      const parsed = JSON.parse(jsonStr);
      return { ...parsed, originalContent: content };
    } catch {
      throw new AppError(
        502,
        'ai-error',
        'AI returned invalid JSON',
      );
    }
  }

  async upload(
    userId: string,
    projectId: string,
    data: {
      content: string;
      filename: string;
      fileType: string;
    },
    ip: string,
    userAgent: string,
  ): Promise<DocumentResponse> {
    await this.verifyProjectAccess(userId, projectId);

    // Create document record
    const doc = await this.fastify.prisma.documentUpload.create({
      data: {
        projectId,
        uploadedBy: userId,
        originalFilename: data.filename,
        fileType: data.fileType,
        fileSizeBytes: data.content.length,
        storageKey: null,
        processingStatus: 'uploaded',
      },
      include: { uploader: true },
    });

    // Extract concepts via AI
    try {
      const extraction = await this.extractConcepts(data.content);

      const updated =
        await this.fastify.prisma.documentUpload.update({
          where: { id: doc.id },
          data: {
            extractionResult:
              extraction as unknown as Prisma.InputJsonValue,
            processingStatus: 'processed',
            processedAt: new Date(),
          },
          include: { uploader: true },
        });

      logger.info('Document processed', {
        documentId: doc.id,
        projectId,
        userId,
        entities: extraction.entities.length,
      });

      await this.audit(
        'document.upload',
        userId,
        doc.id,
        ip,
        userAgent,
        {
          filename: data.filename,
          fileType: data.fileType,
          fileSizeBytes: data.content.length,
          entityCount: extraction.entities.length,
        },
      );

      return this.formatDocument(updated);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : 'Unknown error';

      await this.fastify.prisma.documentUpload.update({
        where: { id: doc.id },
        data: {
          processingStatus: 'error',
          errorMessage: errorMsg,
        },
      });

      throw err;
    }
  }

  async list(
    userId: string,
    projectId: string,
  ): Promise<DocumentListResponse> {
    await this.verifyProjectAccess(userId, projectId);

    const [docs, total] = await Promise.all([
      this.fastify.prisma.documentUpload.findMany({
        where: { projectId },
        include: { uploader: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.fastify.prisma.documentUpload.count({
        where: { projectId },
      }),
    ]);

    return {
      data: docs.map((d) => this.formatDocument(d)),
      meta: { total },
    };
  }

  async getById(
    userId: string,
    projectId: string,
    documentId: string,
  ): Promise<DocumentResponse> {
    await this.verifyProjectAccess(userId, projectId);

    const doc =
      await this.fastify.prisma.documentUpload.findFirst({
        where: { id: documentId, projectId },
        include: { uploader: true },
      });

    if (!doc) {
      throw new AppError(404, 'not-found', 'Document not found');
    }

    return this.formatDocument(doc);
  }

  async generateFromDocument(
    userId: string,
    projectId: string,
    documentId: string,
    data: { type: string; framework: string },
    ip: string,
    userAgent: string,
  ): Promise<unknown> {
    await this.verifyProjectAccess(userId, projectId);

    const doc =
      await this.fastify.prisma.documentUpload.findFirst({
        where: { id: documentId, projectId },
      });

    if (!doc) {
      throw new AppError(404, 'not-found', 'Document not found');
    }

    if (doc.processingStatus !== 'processed' || !doc.extractionResult) {
      throw new AppError(
        400,
        'bad-request',
        'Document has not been processed yet',
      );
    }

    const extraction = doc.extractionResult as unknown as ExtractionResult;

    // Build prompt from extracted concepts
    const conceptSummary = [
      `Entities: ${extraction.entities.map((e) => `${e.name} (${e.type})`).join(', ')}`,
      `Relationships: ${extraction.relationships.map((r) => `${r.source} ${r.type} ${r.target}`).join(', ')}`,
      `Technologies: ${extraction.technologies.join(', ')}`,
      `Patterns: ${extraction.patterns.join(', ')}`,
    ].join('\n');

    const prompt = `Generate a ${data.type} diagram using the ${data.framework} framework based on these extracted architecture concepts:\n\n${conceptSummary}`;

    // Use the artifact generation endpoint via inject
    const app = this.fastify;
    const result = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/artifacts/generate`,
      payload: {
        prompt,
        type: data.type,
        framework: data.framework,
      },
      headers: {
        authorization: `Bearer placeholder`,
      },
    });

    // If direct inject does not work with auth, use the
    // artifact service directly. Fall back to the AI client.
    if (result.statusCode !== 201) {
      // Direct AI call as fallback
      const { ArtifactService } = await import(
        '../artifacts/artifacts.service.js'
      );
      const artifactService = new ArtifactService(this.fastify);
      const artifact = await artifactService.generate(
        userId,
        projectId,
        { prompt, type: data.type, framework: data.framework },
        ip,
        userAgent,
      );

      await this.audit(
        'document.generate',
        userId,
        documentId,
        ip,
        userAgent,
        {
          artifactId: artifact.id,
          type: data.type,
          framework: data.framework,
        },
      );

      return artifact;
    }

    const artifact = result.json();

    await this.audit(
      'document.generate',
      userId,
      documentId,
      ip,
      userAgent,
      {
        artifactId: artifact.id,
        type: data.type,
        framework: data.framework,
      },
    );

    return artifact;
  }
}
