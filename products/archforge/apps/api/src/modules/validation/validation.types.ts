/**
 * Framework Validation Type Definitions
 */

export type ValidationGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export type RuleStatus = 'pass' | 'fail' | 'warning';

export type RuleSeverity = 'error' | 'warning' | 'info';

export interface ValidationRule {
  rule: string;
  status: RuleStatus;
  message: string;
  severity: RuleSeverity;
}

export interface ValidationResult {
  score: number;
  grade: ValidationGrade;
  framework: string;
  rules: ValidationRule[];
  suggestions: string[];
}

export interface ArtifactElementForValidation {
  elementId: string;
  elementType: string;
  name: string;
  description: string | null;
  layer: string | null;
}

export interface ArtifactRelationshipForValidation {
  relationshipId: string;
  sourceElementId: string;
  targetElementId: string;
  relationshipType: string;
  label: string | null;
}
