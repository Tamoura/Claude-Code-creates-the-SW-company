/**
 * Template Type Definitions
 */

export interface TemplateResponse {
  id: string;
  name: string;
  description: string | null;
  category: string;
  subcategory: string | null;
  framework: string;
  isPublic: boolean;
  usageCount: number;
  createdBy: {
    id: string;
    email: string;
    fullName: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TemplateListResponse {
  data: TemplateResponse[];
  meta: {
    total: number;
    pageSize: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}
