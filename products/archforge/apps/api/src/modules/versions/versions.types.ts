/**
 * Version Type Definitions
 */

export interface VersionResponse {
  id: string;
  artifactId: string;
  versionNumber: number;
  canvasData: unknown;
  svgContent: string | null;
  changeSummary: string | null;
  changeType: string;
  createdBy: { id: string; email: string; fullName: string };
  createdAt: string;
}

export interface VersionListResponse {
  data: VersionResponse[];
  meta: {
    total: number;
    pageSize: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export interface VersionDiffResponse {
  fromVersion: number;
  toVersion: number;
  changes: {
    added: unknown[];
    removed: unknown[];
    modified: unknown[];
  };
}
