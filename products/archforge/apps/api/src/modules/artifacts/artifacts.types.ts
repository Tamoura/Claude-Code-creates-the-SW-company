/**
 * Artifact Type Definitions
 */

export interface ArtifactElementData {
  elementId: string;
  elementType: string;
  name: string;
  description: string;
  properties: Record<string, unknown>;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  layer: string | null;
}

export interface ArtifactRelationshipData {
  relationshipId: string;
  sourceElementId: string;
  targetElementId: string;
  relationshipType: string;
  label: string;
}

export interface AiGenerationResult {
  name: string;
  elements: ArtifactElementData[];
  relationships: ArtifactRelationshipData[];
  mermaidDiagram: string;
}

export interface ArtifactResponse {
  id: string;
  projectId: string;
  name: string;
  type: string;
  framework: string;
  status: string;
  svgContent: string | null;
  nlDescription: string | null;
  currentVersion: number;
  createdBy: {
    id: string;
    email: string;
    fullName: string;
  };
  elements: Array<{
    id: string;
    elementId: string;
    elementType: string;
    name: string;
    description: string | null;
    properties: unknown;
    position: unknown;
    layer: string | null;
  }>;
  relationships: Array<{
    id: string;
    relationshipId: string;
    sourceElementId: string;
    targetElementId: string;
    relationshipType: string;
    label: string | null;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface ArtifactListItem {
  id: string;
  projectId: string;
  name: string;
  type: string;
  framework: string;
  status: string;
  currentVersion: number;
  elementCount: number;
  createdBy: {
    id: string;
    email: string;
    fullName: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ArtifactListResponse {
  data: ArtifactListItem[];
  meta: {
    total: number;
    pageSize: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}
