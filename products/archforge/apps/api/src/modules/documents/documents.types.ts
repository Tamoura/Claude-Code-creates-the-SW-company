/**
 * Document Ingestion Type Definitions
 */

export interface ExtractionEntity {
  name: string;
  type: string;
  description: string;
}

export interface ExtractionRelationship {
  source: string;
  target: string;
  type: string;
  description: string;
}

export interface ExtractionResult {
  entities: ExtractionEntity[];
  relationships: ExtractionRelationship[];
  technologies: string[];
  patterns: string[];
  originalContent: string;
}

export interface DocumentResponse {
  id: string;
  projectId: string;
  originalFilename: string;
  fileType: string;
  fileSizeBytes: number;
  processingStatus: string;
  extractionResult: ExtractionResult | null;
  errorMessage: string | null;
  uploadedBy: {
    id: string;
    email: string;
    fullName: string;
  };
  createdAt: string;
  processedAt: string | null;
}

export interface DocumentListResponse {
  data: DocumentResponse[];
  meta: {
    total: number;
  };
}
