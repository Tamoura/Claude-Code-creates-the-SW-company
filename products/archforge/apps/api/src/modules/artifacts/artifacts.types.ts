/**
 * Artifact Type Definitions
 */

export interface ArtifactResponse {
  id: string;
  projectId: string;
  name: string;
  type: string;
  framework: string;
  status: string;
  canvasData: unknown;
  currentVersion: number;
  createdBy: { id: string; email: string; fullName: string };
  createdAt: string;
  updatedAt: string;
}

export interface ArtifactListResponse {
  data: ArtifactResponse[];
  meta: {
    total: number;
    pageSize: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export interface ElementResponse {
  id: string;
  elementId: string;
  elementType: string;
  framework: string;
  name: string;
  description: string | null;
  properties: unknown;
  position: unknown;
  layer: string | null;
}

export interface RelationshipResponse {
  id: string;
  relationshipId: string;
  sourceElementId: string;
  targetElementId: string;
  relationshipType: string;
  framework: string;
  label: string | null;
  properties: unknown;
}
