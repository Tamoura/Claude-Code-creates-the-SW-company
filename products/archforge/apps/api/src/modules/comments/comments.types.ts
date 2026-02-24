/**
 * Comment Type Definitions
 */

export interface CommentResponse {
  id: string;
  artifactId: string;
  body: string;
  status: string;
  elementId: string | null;
  parentCommentId: string | null;
  author: { id: string; email: string; fullName: string };
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}
