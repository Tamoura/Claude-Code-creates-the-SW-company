import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

/**
 * Verify that the production deployment workflow includes a
 * pre-flight test gate: unit tests and lint must pass BEFORE
 * Docker images are built and pushed.
 */

const DEPLOY_WORKFLOW_PATH = path.resolve(
  __dirname,
  '../../../../.github/workflows/deploy-production.yml'
);

interface WorkflowStep {
  name?: string;
  run?: string;
  env?: Record<string, string>;
  'working-directory'?: string;
  [key: string]: unknown;
}

interface ServiceDefinition {
  image?: string;
  env?: Record<string, string>;
  ports?: string[];
  options?: string;
  [key: string]: unknown;
}

interface WorkflowJob {
  steps?: WorkflowStep[];
  services?: Record<string, ServiceDefinition>;
  [key: string]: unknown;
}

interface Workflow {
  jobs?: Record<string, WorkflowJob>;
  [key: string]: unknown;
}

function loadWorkflow(): Workflow {
  const content = fs.readFileSync(DEPLOY_WORKFLOW_PATH, 'utf-8');
  return yaml.load(content) as Workflow;
}

function getDeploySteps(workflow: Workflow): WorkflowStep[] {
  const deployJob = workflow.jobs?.deploy;
  if (!deployJob || !deployJob.steps) return [];
  return deployJob.steps;
}

function stepIndex(steps: WorkflowStep[], nameSubstring: string): number {
  return steps.findIndex(
    (s) => s.name && s.name.includes(nameSubstring)
  );
}

describe('Deploy pre-flight gate', () => {
  let workflow: Workflow;
  let steps: WorkflowStep[];

  beforeAll(() => {
    workflow = loadWorkflow();
    steps = getDeploySteps(workflow);
  });

  it('should have the deploy-production workflow file', () => {
    expect(fs.existsSync(DEPLOY_WORKFLOW_PATH)).toBe(true);
  });

  // --- Unit test pre-flight step ---

  it('should contain a step named "Run API unit tests (pre-flight gate)"', () => {
    const idx = stepIndex(steps, 'Run API unit tests (pre-flight gate)');
    expect(idx).toBeGreaterThanOrEqual(0);
  });

  it('should run the unit test step BEFORE the "Build API" step', () => {
    const testIdx = stepIndex(steps, 'Run API unit tests (pre-flight gate)');
    const buildIdx = stepIndex(steps, 'Build API');
    expect(testIdx).toBeGreaterThanOrEqual(0);
    expect(buildIdx).toBeGreaterThanOrEqual(0);
    expect(testIdx).toBeLessThan(buildIdx);
  });

  it('should set DATABASE_URL on the unit test step', () => {
    const idx = stepIndex(steps, 'Run API unit tests (pre-flight gate)');
    expect(idx).toBeGreaterThanOrEqual(0);
    const step = steps[idx];
    expect(step.env).toBeDefined();
    expect(step.env!.DATABASE_URL).toBeDefined();
    expect(step.env!.DATABASE_URL).toContain('postgresql://');
  });

  it('should set REDIS_URL on the unit test step', () => {
    const idx = stepIndex(steps, 'Run API unit tests (pre-flight gate)');
    const step = steps[idx];
    expect(step.env).toBeDefined();
    expect(step.env!.REDIS_URL).toBeDefined();
    expect(step.env!.REDIS_URL).toContain('redis://');
  });

  it('should set JWT_SECRET on the unit test step', () => {
    const idx = stepIndex(steps, 'Run API unit tests (pre-flight gate)');
    const step = steps[idx];
    expect(step.env).toBeDefined();
    expect(step.env!.JWT_SECRET).toBeDefined();
    expect(step.env!.JWT_SECRET.length).toBeGreaterThanOrEqual(64);
  });

  it('should set NODE_ENV=test on the unit test step', () => {
    const idx = stepIndex(steps, 'Run API unit tests (pre-flight gate)');
    const step = steps[idx];
    expect(step.env).toBeDefined();
    expect(step.env!.NODE_ENV).toBe('test');
  });

  it('should set API_KEY_HMAC_SECRET on the unit test step', () => {
    const idx = stepIndex(steps, 'Run API unit tests (pre-flight gate)');
    const step = steps[idx];
    expect(step.env).toBeDefined();
    expect(step.env!.API_KEY_HMAC_SECRET).toBeDefined();
  });

  // --- Lint pre-flight step ---

  it('should contain a step named "Run API lint check (pre-flight gate)"', () => {
    const idx = stepIndex(steps, 'Run API lint check (pre-flight gate)');
    expect(idx).toBeGreaterThanOrEqual(0);
  });

  it('should run the lint step BEFORE the "Build API" step', () => {
    const lintIdx = stepIndex(steps, 'Run API lint check (pre-flight gate)');
    const buildIdx = stepIndex(steps, 'Build API');
    expect(lintIdx).toBeGreaterThanOrEqual(0);
    expect(buildIdx).toBeGreaterThanOrEqual(0);
    expect(lintIdx).toBeLessThan(buildIdx);
  });

  // --- Services ---

  it('should define a PostgreSQL service for the deploy job', () => {
    const deployJob = workflow.jobs?.deploy;
    expect(deployJob).toBeDefined();
    expect(deployJob!.services).toBeDefined();
    expect(deployJob!.services!.postgres).toBeDefined();
    expect(deployJob!.services!.postgres.image).toContain('postgres');
  });

  it('should define a Redis service for the deploy job', () => {
    const deployJob = workflow.jobs?.deploy;
    expect(deployJob).toBeDefined();
    expect(deployJob!.services).toBeDefined();
    expect(deployJob!.services!.redis).toBeDefined();
    expect(deployJob!.services!.redis.image).toContain('redis');
  });

  it('should expose PostgreSQL on port 5432', () => {
    const pg = workflow.jobs?.deploy?.services?.postgres;
    expect(pg).toBeDefined();
    const ports = pg!.ports?.map(String) ?? [];
    expect(ports.some((p) => p.includes('5432'))).toBe(true);
  });

  it('should expose Redis on port 6379', () => {
    const redis = workflow.jobs?.deploy?.services?.redis;
    expect(redis).toBeDefined();
    const ports = redis!.ports?.map(String) ?? [];
    expect(ports.some((p) => p.includes('6379'))).toBe(true);
  });
});
