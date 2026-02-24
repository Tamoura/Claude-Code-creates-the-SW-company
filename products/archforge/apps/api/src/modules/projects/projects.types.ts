/**
 * Project Type Definitions
 */

export interface ProjectResponse {
  id: string;
  name: string;
  description: string | null;
  frameworkPreference: string;
  status: string;
  artifactCount: number;
  memberCount: number;
  createdBy: {
    id: string;
    email: string;
    fullName: string;
  };
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  thumbnailUrl: string | null;
}

export interface ProjectListResponse {
  data: ProjectResponse[];
  meta: {
    total: number;
    pageSize: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}
