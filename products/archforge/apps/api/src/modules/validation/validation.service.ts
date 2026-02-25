/**
 * Framework Validation Service
 *
 * Validates artifacts against framework-specific rules.
 * Supports C4, ArchiMate, TOGAF, and BPMN frameworks.
 */

import { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { AppError } from '../../types/index.js';
import { logger } from '../../utils/logger.js';
import type {
  ValidationResult,
  ValidationRule,
  ValidationGrade,
  ArtifactElementForValidation,
  ArtifactRelationshipForValidation,
} from './validation.types.js';

export class ValidationService {
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
          resourceType: 'artifact',
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

  static calculateGrade(score: number): ValidationGrade {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  static calculateScore(rules: ValidationRule[]): number {
    if (rules.length === 0) return 0;

    const totalRules = rules.length;
    let passedWeight = 0;

    for (const rule of rules) {
      if (rule.status === 'pass') {
        passedWeight += 1;
      } else if (rule.status === 'warning') {
        passedWeight += 0.5;
      }
      // fail = 0
    }

    return Math.round((passedWeight / totalRules) * 100);
  }

  private validateC4(
    elements: ArtifactElementForValidation[],
    relationships: ArtifactRelationshipForValidation[],
    artifactType: string,
  ): ValidationRule[] {
    const rules: ValidationRule[] = [];

    if (artifactType === 'c4_context') {
      // Must have at least 1 person
      const persons = elements.filter(
        (e) => e.elementType === 'c4_person',
      );
      rules.push({
        rule: 'Context diagram must have at least 1 person',
        status: persons.length >= 1 ? 'pass' : 'fail',
        message:
          persons.length >= 1
            ? `Found ${persons.length} person(s)`
            : 'No persons found in context diagram',
        severity: 'error',
      });

      // Must have at least 1 system
      const systems = elements.filter(
        (e) =>
          e.elementType === 'c4_system' ||
          e.elementType === 'c4_external_system',
      );
      rules.push({
        rule: 'Context diagram must have at least 1 system',
        status: systems.length >= 1 ? 'pass' : 'fail',
        message:
          systems.length >= 1
            ? `Found ${systems.length} system(s)`
            : 'No systems found in context diagram',
        severity: 'error',
      });
    }

    if (artifactType === 'c4_container') {
      const containers = elements.filter(
        (e) =>
          e.elementType === 'c4_container' ||
          e.elementType === 'c4_database' ||
          e.elementType === 'c4_message_queue' ||
          e.elementType === 'c4_api',
      );
      rules.push({
        rule: 'Container diagram must have at least 1 container',
        status: containers.length >= 1 ? 'pass' : 'fail',
        message:
          containers.length >= 1
            ? `Found ${containers.length} container(s)`
            : 'No containers found',
        severity: 'error',
      });
    }

    if (artifactType === 'c4_component') {
      const components = elements.filter(
        (e) =>
          e.elementType === 'c4_component' ||
          e.elementType === 'c4_service',
      );
      rules.push({
        rule: 'Component diagram must have at least 1 component',
        status: components.length >= 1 ? 'pass' : 'fail',
        message:
          components.length >= 1
            ? `Found ${components.length} component(s)`
            : 'No components found',
        severity: 'error',
      });
    }

    // All elements must have descriptions
    const missingDescriptions = elements.filter(
      (e) => !e.description || e.description.trim() === '',
    );
    rules.push({
      rule: 'All elements must have descriptions',
      status: missingDescriptions.length === 0 ? 'pass' : 'fail',
      message:
        missingDescriptions.length === 0
          ? 'All elements have descriptions'
          : `${missingDescriptions.length} element(s) missing descriptions: ${missingDescriptions.map((e) => e.name).join(', ')}`,
      severity: 'warning',
    });

    // Relationships must have labels
    const missingLabels = relationships.filter(
      (r) => !r.label || r.label.trim() === '',
    );
    rules.push({
      rule: 'Relationships must have labels',
      status: missingLabels.length === 0 ? 'pass' : 'fail',
      message:
        missingLabels.length === 0
          ? 'All relationships have labels'
          : `${missingLabels.length} relationship(s) missing labels`,
      severity: 'warning',
    });

    // No orphan elements
    const connectedElementIds = new Set<string>();
    for (const rel of relationships) {
      connectedElementIds.add(rel.sourceElementId);
      connectedElementIds.add(rel.targetElementId);
    }
    const orphans = elements.filter(
      (e) => !connectedElementIds.has(e.elementId),
    );
    rules.push({
      rule: 'No orphan elements (must have at least 1 relationship)',
      status: orphans.length === 0 ? 'pass' : 'warning',
      message:
        orphans.length === 0
          ? 'All elements are connected'
          : `${orphans.length} orphan element(s): ${orphans.map((e) => e.name).join(', ')}`,
      severity: 'warning',
    });

    return rules;
  }

  private validateArchiMate(
    elements: ArtifactElementForValidation[],
    relationships: ArtifactRelationshipForValidation[],
  ): ValidationRule[] {
    const rules: ValidationRule[] = [];

    const validLayers = [
      'business',
      'application',
      'technology',
      'motivation',
      'strategy',
    ];

    const businessElements = [
      'business_actor',
      'business_role',
      'business_process',
      'business_function',
      'business_service',
      'business_object',
      'archimate_business_actor',
      'archimate_business_role',
      'archimate_business_process',
      'archimate_business_service',
      'archimate_business_object',
    ];

    const applicationElements = [
      'application_component',
      'application_service',
      'application_interface',
      'data_object',
      'archimate_application_component',
      'archimate_application_service',
      'archimate_application_interface',
      'archimate_data_object',
    ];

    const technologyElements = [
      'technology_node',
      'technology_device',
      'technology_service',
      'system_software',
      'artifact',
      'archimate_technology_node',
      'archimate_technology_service',
      'archimate_technology_artifact',
      'archimate_technology_network',
    ];

    const allValidElementTypes = [
      ...businessElements,
      ...applicationElements,
      ...technologyElements,
      'archimate_stakeholder',
      'archimate_driver',
      'archimate_goal',
      'archimate_principle',
      'archimate_requirement',
      'archimate_constraint',
    ];

    // Elements must belong to valid layers
    const invalidLayers = elements.filter(
      (e) => e.layer && !validLayers.includes(e.layer),
    );
    rules.push({
      rule: 'Elements must belong to valid ArchiMate layers',
      status: invalidLayers.length === 0 ? 'pass' : 'fail',
      message:
        invalidLayers.length === 0
          ? 'All elements have valid layers'
          : `${invalidLayers.length} element(s) with invalid layers: ${invalidLayers.map((e) => `${e.name} (${e.layer})`).join(', ')}`,
      severity: 'error',
    });

    // Valid relationship types
    const validRelTypes = [
      'serving',
      'realization',
      'triggering',
      'flow',
      'access',
      'composition',
      'aggregation',
      'assignment',
      'serves',
      'triggers',
      'accesses',
      'association',
      'influences',
      'realizes',
    ];

    const invalidRels = relationships.filter(
      (r) => !validRelTypes.includes(r.relationshipType),
    );
    rules.push({
      rule: 'Cross-layer relationships must follow ArchiMate rules',
      status: invalidRels.length === 0 ? 'pass' : 'fail',
      message:
        invalidRels.length === 0
          ? 'All relationships use valid ArchiMate types'
          : `${invalidRels.length} relationship(s) with invalid types: ${invalidRels.map((r) => r.relationshipType).join(', ')}`,
      severity: 'error',
    });

    // Elements must have valid types
    const invalidTypes = elements.filter(
      (e) => !allValidElementTypes.includes(e.elementType),
    );
    rules.push({
      rule: 'Elements must have valid ArchiMate element types',
      status: invalidTypes.length === 0 ? 'pass' : 'fail',
      message:
        invalidTypes.length === 0
          ? 'All elements have valid types'
          : `${invalidTypes.length} element(s) with invalid types`,
      severity: 'error',
    });

    // All elements must have descriptions
    const missingDescriptions = elements.filter(
      (e) => !e.description || e.description.trim() === '',
    );
    rules.push({
      rule: 'All elements must have descriptions',
      status: missingDescriptions.length === 0 ? 'pass' : 'fail',
      message:
        missingDescriptions.length === 0
          ? 'All elements have descriptions'
          : `${missingDescriptions.length} element(s) missing descriptions`,
      severity: 'warning',
    });

    return rules;
  }

  private validateTOGAF(
    elements: ArtifactElementForValidation[],
    _relationships: ArtifactRelationshipForValidation[],
  ): ValidationRule[] {
    const rules: ValidationRule[] = [];

    const admPhaseOrder = [
      'preliminary',
      'architecture_vision',
      'business_architecture',
      'is_architecture',
      'technology_architecture',
      'opportunities_and_solutions',
      'migration_planning',
      'implementation_governance',
      'architecture_change_management',
      'requirements_management',
    ];

    // Check phases are present
    const phases = elements.filter(
      (e) => e.elementType === 'togaf_phase',
    );
    rules.push({
      rule: 'ADM phases must be present',
      status: phases.length > 0 ? 'pass' : 'fail',
      message:
        phases.length > 0
          ? `Found ${phases.length} ADM phase(s)`
          : 'No ADM phases found',
      severity: 'error',
    });

    // Check phases are in order (by name matching)
    if (phases.length > 1) {
      const phaseNames = phases.map((p) =>
        p.name.toLowerCase().replace(/\s+/g, '_'),
      );
      const phaseIndices = phaseNames
        .map((name) => {
          return admPhaseOrder.findIndex(
            (phase) =>
              name.includes(phase) || phase.includes(name),
          );
        })
        .filter((i) => i >= 0);

      let inOrder = true;
      for (let i = 1; i < phaseIndices.length; i++) {
        if (phaseIndices[i] < phaseIndices[i - 1]) {
          inOrder = false;
          break;
        }
      }

      rules.push({
        rule: 'ADM phases must be in correct order',
        status: inOrder ? 'pass' : 'warning',
        message: inOrder
          ? 'Phases are in correct ADM order'
          : 'Phases may not follow standard ADM order',
        severity: 'warning',
      });
    }

    // Each phase should have at least 1 deliverable
    const deliverables = elements.filter(
      (e) => e.elementType === 'togaf_deliverable',
    );
    rules.push({
      rule: 'Each phase should have at least 1 deliverable',
      status: deliverables.length > 0 ? 'pass' : 'warning',
      message:
        deliverables.length > 0
          ? `Found ${deliverables.length} deliverable(s)`
          : 'No deliverables found',
      severity: 'warning',
    });

    // Building blocks must be classified (ABB or SBB)
    const buildingBlocks = elements.filter(
      (e) => e.elementType === 'togaf_building_block',
    );
    if (buildingBlocks.length > 0) {
      const unclassified = buildingBlocks.filter((bb) => {
        const desc = (bb.description || '').toLowerCase();
        const name = bb.name.toLowerCase();
        return (
          !desc.includes('abb') &&
          !desc.includes('sbb') &&
          !name.includes('abb') &&
          !name.includes('sbb')
        );
      });

      rules.push({
        rule: 'Building blocks must be classified (ABB or SBB)',
        status: unclassified.length === 0 ? 'pass' : 'warning',
        message:
          unclassified.length === 0
            ? 'All building blocks are classified'
            : `${unclassified.length} building block(s) not classified as ABB or SBB`,
        severity: 'warning',
      });
    }

    // Elements must have descriptions
    const missingDescriptions = elements.filter(
      (e) => !e.description || e.description.trim() === '',
    );
    rules.push({
      rule: 'All elements must have descriptions',
      status: missingDescriptions.length === 0 ? 'pass' : 'fail',
      message:
        missingDescriptions.length === 0
          ? 'All elements have descriptions'
          : `${missingDescriptions.length} element(s) missing descriptions`,
      severity: 'warning',
    });

    return rules;
  }

  private validateBPMN(
    elements: ArtifactElementForValidation[],
    relationships: ArtifactRelationshipForValidation[],
  ): ValidationRule[] {
    const rules: ValidationRule[] = [];

    // Must have exactly 1 start event
    const startEvents = elements.filter(
      (e) => e.elementType === 'bpmn_start_event',
    );
    rules.push({
      rule: 'Process must have exactly 1 start event',
      status: startEvents.length === 1 ? 'pass' : 'fail',
      message:
        startEvents.length === 1
          ? 'Process has 1 start event'
          : `Found ${startEvents.length} start event(s), expected exactly 1`,
      severity: 'error',
    });

    // Must have at least 1 end event
    const endEvents = elements.filter(
      (e) => e.elementType === 'bpmn_end_event',
    );
    rules.push({
      rule: 'Process must have at least 1 end event',
      status: endEvents.length >= 1 ? 'pass' : 'fail',
      message:
        endEvents.length >= 1
          ? `Found ${endEvents.length} end event(s)`
          : 'No end events found',
      severity: 'error',
    });

    // All gateways must have 2+ outgoing connections
    const gateways = elements.filter(
      (e) =>
        e.elementType === 'bpmn_gateway' ||
        e.elementType === 'bpmn_exclusive_gateway' ||
        e.elementType === 'bpmn_parallel_gateway',
    );

    if (gateways.length > 0) {
      const gatewaysWithFewOutputs = gateways.filter((gw) => {
        const outgoing = relationships.filter(
          (r) => r.sourceElementId === gw.elementId,
        );
        return outgoing.length < 2;
      });

      rules.push({
        rule: 'All gateways must have 2+ outgoing connections',
        status:
          gatewaysWithFewOutputs.length === 0 ? 'pass' : 'fail',
        message:
          gatewaysWithFewOutputs.length === 0
            ? 'All gateways have sufficient outgoing connections'
            : `${gatewaysWithFewOutputs.length} gateway(s) with fewer than 2 outgoing connections`,
        severity: 'error',
      });
    }

    // Every task must be reachable from start event
    if (startEvents.length > 0) {
      const reachable = new Set<string>();
      const queue = startEvents.map((e) => e.elementId);

      while (queue.length > 0) {
        const current = queue.shift()!;
        if (reachable.has(current)) continue;
        reachable.add(current);

        const outgoing = relationships.filter(
          (r) => r.sourceElementId === current,
        );
        for (const rel of outgoing) {
          if (!reachable.has(rel.targetElementId)) {
            queue.push(rel.targetElementId);
          }
        }
      }

      const tasks = elements.filter(
        (e) =>
          e.elementType === 'bpmn_task' ||
          e.elementType === 'bpmn_service_task' ||
          e.elementType === 'bpmn_user_task',
      );

      const unreachable = tasks.filter(
        (t) => !reachable.has(t.elementId),
      );

      rules.push({
        rule: 'Every task must be reachable from start event',
        status: unreachable.length === 0 ? 'pass' : 'fail',
        message:
          unreachable.length === 0
            ? 'All tasks are reachable from the start event'
            : `${unreachable.length} task(s) not reachable: ${unreachable.map((t) => t.name).join(', ')}`,
        severity: 'error',
      });
    }

    return rules;
  }

  async validate(
    userId: string,
    projectId: string,
    artifactId: string,
    ip: string,
    userAgent: string,
  ): Promise<ValidationResult> {
    await this.verifyProjectAccess(userId, projectId);

    const artifact = await this.fastify.prisma.artifact.findFirst(
      {
        where: { id: artifactId, projectId },
        include: {
          elements: true,
          relationships: true,
        },
      },
    );

    if (!artifact) {
      throw new AppError(404, 'not-found', 'Artifact not found');
    }

    const elements: ArtifactElementForValidation[] =
      artifact.elements.map((e) => ({
        elementId: e.elementId,
        elementType: e.elementType,
        name: e.name,
        description: e.description,
        layer: e.layer,
      }));

    const relationships: ArtifactRelationshipForValidation[] =
      artifact.relationships.map((r) => ({
        relationshipId: r.relationshipId,
        sourceElementId: r.sourceElementId,
        targetElementId: r.targetElementId,
        relationshipType: r.relationshipType,
        label: r.label,
      }));

    let rules: ValidationRule[];

    // If artifact has no elements, score is 0
    if (elements.length === 0) {
      rules = [{
        rule: 'Artifact must contain elements',
        status: 'fail',
        message: 'No elements found in artifact',
        severity: 'error',
      }];
    } else {
      switch (artifact.framework) {
        case 'c4':
          rules = this.validateC4(
            elements,
            relationships,
            artifact.type,
          );
          break;
        case 'archimate':
          rules = this.validateArchiMate(elements, relationships);
          break;
        case 'togaf':
          rules = this.validateTOGAF(elements, relationships);
          break;
        case 'bpmn':
          rules = this.validateBPMN(elements, relationships);
          break;
        default:
          rules = [];
          break;
      }
    }

    const score = ValidationService.calculateScore(rules);
    const grade = ValidationService.calculateGrade(score);

    // Generate suggestions
    const suggestions: string[] = [];
    const failedRules = rules.filter((r) => r.status === 'fail');
    const warningRules = rules.filter(
      (r) => r.status === 'warning',
    );

    for (const rule of failedRules) {
      suggestions.push(`Fix: ${rule.message}`);
    }
    for (const rule of warningRules) {
      suggestions.push(`Consider: ${rule.message}`);
    }

    if (elements.length === 0) {
      suggestions.push(
        'Add elements to the diagram to improve the score',
      );
    }

    if (relationships.length === 0 && elements.length > 1) {
      suggestions.push(
        'Add relationships between elements to show connections',
      );
    }

    const result: ValidationResult = {
      score,
      grade,
      framework: artifact.framework,
      rules,
      suggestions,
    };

    logger.info('Artifact validated', {
      artifactId,
      framework: artifact.framework,
      score,
      grade,
    });

    await this.audit(
      'artifact.validate',
      userId,
      artifactId,
      ip,
      userAgent,
      {
        framework: artifact.framework,
        score,
        grade,
        ruleCount: rules.length,
        failCount: failedRules.length,
      },
    );

    return result;
  }
}
