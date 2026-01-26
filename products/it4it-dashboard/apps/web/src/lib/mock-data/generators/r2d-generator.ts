import { faker } from "@faker-js/faker";
import type {
  Requirement,
  RequirementStatus,
  RequirementPriority,
  Build,
  BuildStatus,
  Deployment,
  DeploymentStatus,
  Environment,
  Release,
  ReleaseStatus,
  ReleaseType,
  Pipeline,
  PipelineStatus,
} from "@/types/r2d";

const requirementStatuses: RequirementStatus[] = ["draft", "approved", "in_progress", "completed", "cancelled"];
const requirementTitles = [
  "Implement user authentication",
  "Add payment gateway integration",
  "Optimize database queries",
  "Implement real-time notifications",
  "Add dark mode support",
  "Implement data export feature",
  "Add multi-language support",
  "Implement caching layer",
];

export function generateRequirement(id?: string): Requirement {
  const status = faker.helpers.arrayElement(requirementStatuses);
  const createdAt = faker.date.past({ years: 1 });
  const updatedAt = faker.date.between({ from: createdAt, to: new Date() });

  const requirement: Requirement = {
    id: id || `REQ-${faker.string.alphanumeric({ length: 6, casing: "upper" })}`,
    title: faker.helpers.arrayElement(requirementTitles),
    description: faker.lorem.paragraph(),
    status,
    priority: faker.helpers.arrayElement([1, 2, 3, 4]) as RequirementPriority,
    assignee: faker.person.fullName(),
    epic: faker.helpers.maybe(() => `EPIC-${faker.string.alphanumeric(4).toUpperCase()}`, { probability: 0.7 }),
    storyPoints: faker.helpers.maybe(() => faker.helpers.arrayElement([1, 2, 3, 5, 8, 13]), { probability: 0.8 }),
    createdAt,
    updatedAt,
  };

  if (status === "completed") {
    requirement.completedAt = faker.date.between({ from: updatedAt, to: new Date() });
  }

  return requirement;
}

export function generateRequirements(count: number): Requirement[] {
  return Array.from({ length: count }, () => generateRequirement());
}

const buildStatuses: BuildStatus[] = ["pending", "running", "success", "failed", "cancelled"];
const repositories = ["api-service", "web-app", "mobile-app", "data-pipeline", "auth-service"];
const branches = ["main", "develop", "feature/auth", "feature/payments", "hotfix/critical-bug"];

export function generateBuild(id?: string): Build {
  const status = faker.helpers.arrayElement(buildStatuses);
  const startedAt = faker.date.recent({ days: 7 });

  const build: Build = {
    id: id || `BUILD-${faker.string.alphanumeric({ length: 8, casing: "upper" })}`,
    pipelineId: `PIPE-${faker.string.alphanumeric({ length: 6, casing: "upper" })}`,
    pipelineName: `${faker.helpers.arrayElement(repositories)} CI/CD`,
    repository: faker.helpers.arrayElement(repositories),
    branch: faker.helpers.arrayElement(branches),
    commit: faker.git.commitSha({ length: 7 }),
    commitMessage: faker.git.commitMessage(),
    status,
    triggeredBy: faker.person.fullName(),
    startedAt,
  };

  if (status === "success" || status === "failed") {
    const durationSeconds = faker.number.int({ min: 60, max: 1800 });
    build.duration = durationSeconds;
    build.completedAt = new Date(startedAt.getTime() + durationSeconds * 1000);
  }

  return build;
}

export function generateBuilds(count: number): Build[] {
  return Array.from({ length: count }, () => generateBuild());
}

const deploymentStatuses: DeploymentStatus[] = ["pending", "in_progress", "success", "failed", "rolled_back"];
const environments: Environment[] = ["development", "staging", "production"];

export function generateDeployment(id?: string): Deployment {
  const status = faker.helpers.arrayElement(deploymentStatuses);
  const startedAt = faker.date.recent({ days: 14 });

  const deployment: Deployment = {
    id: id || `DEP-${faker.string.alphanumeric({ length: 8, casing: "upper" })}`,
    releaseId: `REL-${faker.string.alphanumeric({ length: 6, casing: "upper" })}`,
    releaseName: `Release ${faker.system.semver()}`,
    version: faker.system.semver(),
    environment: faker.helpers.arrayElement(environments),
    status,
    deployedBy: faker.person.fullName(),
    buildId: `BUILD-${faker.string.alphanumeric({ length: 8, casing: "upper" })}`,
    startedAt,
    rollbackAvailable: status === "success" && faker.datatype.boolean({ probability: 0.8 }),
  };

  if (status === "success" || status === "failed") {
    const durationSeconds = faker.number.int({ min: 120, max: 900 });
    deployment.duration = durationSeconds;
    deployment.completedAt = new Date(startedAt.getTime() + durationSeconds * 1000);
  }

  return deployment;
}

export function generateDeployments(count: number): Deployment[] {
  return Array.from({ length: count }, () => generateDeployment());
}

const releaseStatuses: ReleaseStatus[] = ["draft", "scheduled", "in_progress", "completed", "failed", "cancelled"];
const releaseTypes: ReleaseType[] = ["major", "minor", "patch", "hotfix"];

export function generateRelease(id?: string): Release {
  const status = faker.helpers.arrayElement(releaseStatuses);
  const version = faker.system.semver();

  const release: Release = {
    id: id || `REL-${faker.string.alphanumeric({ length: 6, casing: "upper" })}`,
    name: `Release ${version}`,
    version,
    type: faker.helpers.arrayElement(releaseTypes),
    status,
    description: faker.lorem.paragraph(),
    releaseNotes: faker.helpers.multiple(() => `- ${faker.lorem.sentence()}`, { count: { min: 3, max: 8 } }).join("\n"),
    createdBy: faker.person.fullName(),
    requirements: faker.helpers.multiple(
      () => `REQ-${faker.string.alphanumeric({ length: 6, casing: "upper" })}`,
      { count: { min: 3, max: 10 } }
    ),
    builds: faker.helpers.multiple(
      () => `BUILD-${faker.string.alphanumeric({ length: 8, casing: "upper" })}`,
      { count: { min: 1, max: 5 } }
    ),
  };

  if (status === "scheduled" || status === "in_progress" || status === "completed") {
    release.scheduledDate = faker.date.soon({ days: 30 });
  }

  if (status === "completed") {
    release.releasedAt = faker.date.recent({ days: 60 });
    release.approvedBy = faker.person.fullName();
  }

  return release;
}

export function generateReleases(count: number): Release[] {
  return Array.from({ length: count }, () => generateRelease());
}

const pipelineStatuses: PipelineStatus[] = ["active", "paused", "disabled"];
const triggerTypes = ["manual", "push", "pr", "scheduled"] as const;

export function generatePipeline(id?: string): Pipeline {
  const createdAt = faker.date.past({ years: 2 });
  const updatedAt = faker.date.between({ from: createdAt, to: new Date() });

  const pipeline: Pipeline = {
    id: id || `PIPE-${faker.string.alphanumeric({ length: 6, casing: "upper" })}`,
    name: `${faker.helpers.arrayElement(repositories)} CI/CD`,
    repository: faker.helpers.arrayElement(repositories),
    branch: faker.helpers.arrayElement(branches),
    status: faker.helpers.arrayElement(pipelineStatuses),
    triggerType: faker.helpers.arrayElement(triggerTypes),
    createdAt,
    updatedAt,
  };

  if (faker.datatype.boolean({ probability: 0.8 })) {
    pipeline.lastRunId = `BUILD-${faker.string.alphanumeric({ length: 8, casing: "upper" })}`;
    pipeline.lastRunStatus = faker.helpers.arrayElement(buildStatuses);
    pipeline.lastRunAt = faker.date.recent({ days: 7 });
  }

  return pipeline;
}

export function generatePipelines(count: number): Pipeline[] {
  return Array.from({ length: count }, () => generatePipeline());
}
