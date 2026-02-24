/**
 * Export Service
 *
 * Generates export content for artifacts in various formats.
 * For MVP, returns content directly (no file storage).
 */

import { FastifyInstance } from 'fastify';
import { AppError } from '../../types/index.js';
import { logger } from '../../utils/logger.js';
import type { ExportResult } from './exports.types.js';

export class ExportService {
  constructor(private fastify: FastifyInstance) {}

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
          resourceType: 'export',
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

  async exportArtifact(
    userId: string,
    projectId: string,
    artifactId: string,
    format: string,
    ip: string,
    userAgent: string,
  ): Promise<ExportResult> {
    const workspaceId = await this.getWorkspaceId(userId);

    // Verify project access
    const project = await this.fastify.prisma.project.findFirst({
      where: { id: projectId, workspaceId },
    });

    if (!project) {
      throw new AppError(404, 'not-found', 'Project not found');
    }

    const artifact =
      await this.fastify.prisma.artifact.findFirst({
        where: { id: artifactId, projectId },
        include: {
          elements: true,
          relationships: true,
        },
      });

    if (!artifact) {
      throw new AppError(404, 'not-found', 'Artifact not found');
    }

    const slug = artifact.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    let content: string;
    let contentType: string;
    let filename: string;

    switch (format) {
      case 'json': {
        content = JSON.stringify(
          {
            name: artifact.name,
            type: artifact.type,
            framework: artifact.framework,
            version: artifact.currentVersion,
            elements: artifact.elements.map((el) => ({
              elementId: el.elementId,
              elementType: el.elementType,
              name: el.name,
              description: el.description,
              properties: el.properties,
              position: el.position,
              layer: el.layer,
            })),
            relationships: artifact.relationships.map(
              (rel) => ({
                relationshipId: rel.relationshipId,
                sourceElementId: rel.sourceElementId,
                targetElementId: rel.targetElementId,
                relationshipType: rel.relationshipType,
                label: rel.label,
              }),
            ),
          },
          null,
          2,
        );
        contentType = 'application/json';
        filename = `${slug}.json`;
        break;
      }

      case 'mermaid': {
        content =
          artifact.svgContent ||
          this.generateMermaid(artifact);
        contentType = 'text/plain';
        filename = `${slug}.mmd`;
        break;
      }

      case 'plantuml': {
        content = this.generatePlantUML(artifact);
        contentType = 'text/plain';
        filename = `${slug}.puml`;
        break;
      }

      case 'svg': {
        // Return the mermaid content (client renders it)
        content =
          artifact.svgContent ||
          this.generateMermaid(artifact);
        contentType = 'text/plain';
        filename = `${slug}.mmd`;
        break;
      }

      default:
        throw new AppError(
          400,
          'bad-request',
          `Unsupported format: ${format}`,
        );
    }

    logger.info('Artifact exported', {
      artifactId,
      format,
      userId,
    });
    await this.audit(
      'export.create',
      userId,
      artifactId,
      ip,
      userAgent,
      { format },
    );

    return { format, filename, content, contentType };
  }

  private generateMermaid(artifact: {
    elements: Array<{
      elementId: string;
      name: string;
      elementType: string;
    }>;
    relationships: Array<{
      sourceElementId: string;
      targetElementId: string;
      label: string | null;
    }>;
  }): string {
    const lines = ['graph TD'];
    const idMap = new Map<string, string>();

    artifact.elements.forEach((el, i) => {
      const nodeId = String.fromCharCode(65 + i); // A, B, C...
      idMap.set(el.elementId, nodeId);

      const shape = el.elementType.includes('database')
        ? `${nodeId}[(${el.name})]`
        : el.elementType.includes('person')
          ? `${nodeId}(("${el.name}"))`
          : `${nodeId}["${el.name}"]`;

      lines.push(`  ${shape}`);
    });

    artifact.relationships.forEach((rel) => {
      const src = idMap.get(rel.sourceElementId) || '?';
      const tgt = idMap.get(rel.targetElementId) || '?';
      const label = rel.label
        ? `|${rel.label}|`
        : '';
      lines.push(`  ${src} -->${label} ${tgt}`);
    });

    return lines.join('\n');
  }

  private generatePlantUML(artifact: {
    name: string;
    framework: string;
    elements: Array<{
      elementId: string;
      name: string;
      elementType: string;
      description: string | null;
    }>;
    relationships: Array<{
      sourceElementId: string;
      targetElementId: string;
      relationshipType: string;
      label: string | null;
    }>;
  }): string {
    const lines = ['@startuml'];
    lines.push(`title ${artifact.name}`);
    lines.push('');

    const cleanId = (id: string) =>
      id.replace(/[^a-zA-Z0-9_]/g, '_');

    artifact.elements.forEach((el) => {
      const id = cleanId(el.elementId);
      if (el.elementType.includes('database')) {
        lines.push(`database "${el.name}" as ${id}`);
      } else if (el.elementType.includes('person')) {
        lines.push(`actor "${el.name}" as ${id}`);
      } else if (el.elementType.includes('component')) {
        lines.push(`component "${el.name}" as ${id}`);
      } else {
        lines.push(`rectangle "${el.name}" as ${id}`);
      }
    });

    lines.push('');

    artifact.relationships.forEach((rel) => {
      const src = cleanId(rel.sourceElementId);
      const tgt = cleanId(rel.targetElementId);
      const label = rel.label ? ` : ${rel.label}` : '';
      lines.push(`${src} --> ${tgt}${label}`);
    });

    lines.push('');
    lines.push('@enduml');
    return lines.join('\n');
  }
}
