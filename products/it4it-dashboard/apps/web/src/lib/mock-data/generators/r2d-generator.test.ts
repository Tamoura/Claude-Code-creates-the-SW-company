import { describe, it, expect } from "vitest";
import {
  generateRequirement,
  generateRequirements,
  generateBuild,
  generateBuilds,
  generateDeployment,
  generateDeployments,
  generateRelease,
  generateReleases,
  generatePipeline,
  generatePipelines,
} from "./r2d-generator";

describe("R2D Generator", () => {
  describe("generateRequirement", () => {
    it("generates a requirement with all required fields", () => {
      const requirement = generateRequirement();

      expect(requirement.id).toMatch(/^REQ-[A-Z0-9]{6}$/);
      expect(requirement.title).toBeTruthy();
      expect(requirement.description).toBeTruthy();
      expect(["draft", "approved", "in_progress", "completed", "cancelled"]).toContain(requirement.status);
      expect([1, 2, 3, 4]).toContain(requirement.priority);
      expect(requirement.assignee).toBeTruthy();
      expect(requirement.createdAt).toBeInstanceOf(Date);
      expect(requirement.updatedAt).toBeInstanceOf(Date);
    });

    it("includes completed date for completed requirements", () => {
      const requirement = generateRequirement();
      if (requirement.status === "completed") {
        expect(requirement.completedAt).toBeInstanceOf(Date);
      }
    });

    it("accepts a custom id", () => {
      const requirement = generateRequirement("REQ-CUSTOM");
      expect(requirement.id).toBe("REQ-CUSTOM");
    });
  });

  describe("generateRequirements", () => {
    it("generates multiple requirements", () => {
      const requirements = generateRequirements(5);
      expect(requirements).toHaveLength(5);
      requirements.forEach((req) => {
        expect(req.id).toMatch(/^REQ-[A-Z0-9]{6}$/);
      });
    });
  });

  describe("generateBuild", () => {
    it("generates a build with all required fields", () => {
      const build = generateBuild();

      expect(build.id).toMatch(/^BUILD-[A-Z0-9]{8}$/);
      expect(build.pipelineId).toMatch(/^PIPE-[A-Z0-9]{6}$/);
      expect(build.pipelineName).toBeTruthy();
      expect(build.repository).toBeTruthy();
      expect(build.branch).toBeTruthy();
      expect(build.commit).toMatch(/^[a-f0-9]{7}$/);
      expect(build.commitMessage).toBeTruthy();
      expect(["pending", "running", "success", "failed", "cancelled"]).toContain(build.status);
      expect(build.triggeredBy).toBeTruthy();
      expect(build.startedAt).toBeInstanceOf(Date);
    });

    it("includes completion time and duration for completed builds", () => {
      const build = generateBuild();
      if (build.status === "success" || build.status === "failed") {
        expect(build.completedAt).toBeInstanceOf(Date);
        expect(build.duration).toBeGreaterThan(0);
      }
    });

    it("accepts a custom id", () => {
      const build = generateBuild("BUILD-CUSTOM01");
      expect(build.id).toBe("BUILD-CUSTOM01");
    });
  });

  describe("generateBuilds", () => {
    it("generates multiple builds", () => {
      const builds = generateBuilds(5);
      expect(builds).toHaveLength(5);
      builds.forEach((build) => {
        expect(build.id).toMatch(/^BUILD-[A-Z0-9]{8}$/);
      });
    });
  });

  describe("generateDeployment", () => {
    it("generates a deployment with all required fields", () => {
      const deployment = generateDeployment();

      expect(deployment.id).toMatch(/^DEP-[A-Z0-9]{8}$/);
      expect(deployment.releaseId).toMatch(/^REL-[A-Z0-9]{6}$/);
      expect(deployment.releaseName).toBeTruthy();
      expect(deployment.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(["development", "staging", "production"]).toContain(deployment.environment);
      expect(["pending", "in_progress", "success", "failed", "rolled_back"]).toContain(deployment.status);
      expect(deployment.deployedBy).toBeTruthy();
      expect(deployment.buildId).toMatch(/^BUILD-[A-Z0-9]{8}$/);
      expect(deployment.startedAt).toBeInstanceOf(Date);
      expect(typeof deployment.rollbackAvailable).toBe("boolean");
    });

    it("includes completion time for completed deployments", () => {
      const deployment = generateDeployment();
      if (deployment.status === "success" || deployment.status === "failed") {
        expect(deployment.completedAt).toBeInstanceOf(Date);
        expect(deployment.duration).toBeGreaterThan(0);
      }
    });

    it("accepts a custom id", () => {
      const deployment = generateDeployment("DEP-CUSTOM01");
      expect(deployment.id).toBe("DEP-CUSTOM01");
    });
  });

  describe("generateDeployments", () => {
    it("generates multiple deployments", () => {
      const deployments = generateDeployments(5);
      expect(deployments).toHaveLength(5);
      deployments.forEach((dep) => {
        expect(dep.id).toMatch(/^DEP-[A-Z0-9]{8}$/);
      });
    });
  });

  describe("generateRelease", () => {
    it("generates a release with all required fields", () => {
      const release = generateRelease();

      expect(release.id).toMatch(/^REL-[A-Z0-9]{6}$/);
      expect(release.name).toBeTruthy();
      expect(release.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(["major", "minor", "patch", "hotfix"]).toContain(release.type);
      expect(["draft", "scheduled", "in_progress", "completed", "failed", "cancelled"]).toContain(release.status);
      expect(release.description).toBeTruthy();
      expect(release.releaseNotes).toBeTruthy();
      expect(release.createdBy).toBeTruthy();
      expect(Array.isArray(release.requirements)).toBe(true);
      expect(Array.isArray(release.builds)).toBe(true);
    });

    it("includes release date for completed releases", () => {
      const release = generateRelease();
      if (release.status === "completed") {
        expect(release.releasedAt).toBeInstanceOf(Date);
        expect(release.approvedBy).toBeTruthy();
      }
    });

    it("accepts a custom id", () => {
      const release = generateRelease("REL-CUSTOM");
      expect(release.id).toBe("REL-CUSTOM");
    });
  });

  describe("generateReleases", () => {
    it("generates multiple releases", () => {
      const releases = generateReleases(5);
      expect(releases).toHaveLength(5);
      releases.forEach((rel) => {
        expect(rel.id).toMatch(/^REL-[A-Z0-9]{6}$/);
      });
    });
  });

  describe("generatePipeline", () => {
    it("generates a pipeline with all required fields", () => {
      const pipeline = generatePipeline();

      expect(pipeline.id).toMatch(/^PIPE-[A-Z0-9]{6}$/);
      expect(pipeline.name).toBeTruthy();
      expect(pipeline.repository).toBeTruthy();
      expect(pipeline.branch).toBeTruthy();
      expect(["active", "paused", "disabled"]).toContain(pipeline.status);
      expect(["manual", "push", "pr", "scheduled"]).toContain(pipeline.triggerType);
      expect(pipeline.createdAt).toBeInstanceOf(Date);
      expect(pipeline.updatedAt).toBeInstanceOf(Date);
    });

    it("includes last run info for pipelines with runs", () => {
      const pipeline = generatePipeline();
      if (pipeline.lastRunId) {
        expect(pipeline.lastRunId).toMatch(/^BUILD-[A-Z0-9]{8}$/);
        expect(pipeline.lastRunStatus).toBeTruthy();
        expect(pipeline.lastRunAt).toBeInstanceOf(Date);
      }
    });

    it("accepts a custom id", () => {
      const pipeline = generatePipeline("PIPE-CUSTOM");
      expect(pipeline.id).toBe("PIPE-CUSTOM");
    });
  });

  describe("generatePipelines", () => {
    it("generates multiple pipelines", () => {
      const pipelines = generatePipelines(5);
      expect(pipelines).toHaveLength(5);
      pipelines.forEach((pipe) => {
        expect(pipe.id).toMatch(/^PIPE-[A-Z0-9]{6}$/);
      });
    });
  });
});
