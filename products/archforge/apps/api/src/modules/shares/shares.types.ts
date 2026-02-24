/**
 * Share Type Definitions
 */

export interface ShareResponse {
  id: string;
  artifactId: string;
  permission: string;
  shareType: string;
  email: string | null;
  linkToken: string | null;
  expiresAt: string | null;
  sharedBy: { id: string; email: string; fullName: string };
  sharedWith: { id: string; email: string; fullName: string } | null;
  createdAt: string;
}

export interface LinkResolveResponse {
  artifactId: string;
  permission: string;
  expiresAt: string | null;
}
