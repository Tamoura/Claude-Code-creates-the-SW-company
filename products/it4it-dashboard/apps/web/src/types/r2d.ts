/**
 * Requirement to Deploy (R2D) Value Stream Types
 */

export type RequirementStatus = "draft" | "approved" | "in_progress" | "completed" | "cancelled";
export type RequirementPriority = 1 | 2 | 3 | 4; // 1=Critical, 4=Low

export interface Requirement {
  id: string;
  title: string;
  description: string;
  status: RequirementStatus;
  priority: RequirementPriority;
  assignee: string;
  epic?: string;
  storyPoints?: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export type BuildStatus = "pending" | "running" | "success" | "failed" | "cancelled";

export interface Build {
  id: string;
  pipelineId: string;
  pipelineName: string;
  repository: string;
  branch: string;
  commit: string;
  commitMessage: string;
  status: BuildStatus;
  triggeredBy: string;
  startedAt: Date;
  completedAt?: Date;
  duration?: number; // in seconds
  logs?: string;
}

export type DeploymentStatus = "pending" | "in_progress" | "success" | "failed" | "rolled_back";
export type Environment = "development" | "staging" | "production";

export interface Deployment {
  id: string;
  releaseId: string;
  releaseName: string;
  version: string;
  environment: Environment;
  status: DeploymentStatus;
  deployedBy: string;
  buildId: string;
  startedAt: Date;
  completedAt?: Date;
  duration?: number; // in seconds
  rollbackAvailable: boolean;
}

export type ReleaseStatus = "draft" | "scheduled" | "in_progress" | "completed" | "failed" | "cancelled";
export type ReleaseType = "major" | "minor" | "patch" | "hotfix";

export interface Release {
  id: string;
  name: string;
  version: string;
  type: ReleaseType;
  status: ReleaseStatus;
  description: string;
  releaseNotes: string;
  scheduledDate?: Date;
  releasedAt?: Date;
  createdBy: string;
  approvedBy?: string;
  requirements: string[];
  builds: string[];
}

export type PipelineStatus = "active" | "paused" | "disabled";

export interface Pipeline {
  id: string;
  name: string;
  repository: string;
  branch: string;
  status: PipelineStatus;
  lastRunId?: string;
  lastRunStatus?: BuildStatus;
  lastRunAt?: Date;
  triggerType: "manual" | "push" | "pr" | "scheduled";
  createdAt: Date;
  updatedAt: Date;
}

export interface EnvironmentConfig {
  name: Environment;
  url: string;
  version?: string;
  lastDeployedAt?: Date;
  health: "healthy" | "degraded" | "down";
  replicas?: number;
}
