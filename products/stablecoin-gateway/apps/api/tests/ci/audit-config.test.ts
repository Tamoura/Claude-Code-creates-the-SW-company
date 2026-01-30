import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

/**
 * SEC-032: Verify that the CI workflow enforces npm audit
 * so builds fail on HIGH or CRITICAL vulnerabilities.
 *
 * Policy: npm audit must block CI on high/critical vulns.
 * continue-on-error must NOT be set on audit steps.
 */

const CI_WORKFLOW_PATH = path.resolve(
  __dirname,
  '../../../../.github/workflows/ci.yml'
);

interface WorkflowStep {
  name?: string;
  run?: string;
  'continue-on-error'?: boolean;
  [key: string]: unknown;
}

interface WorkflowJob {
  steps?: WorkflowStep[];
  [key: string]: unknown;
}

interface Workflow {
  jobs?: Record<string, WorkflowJob>;
  [key: string]: unknown;
}

function loadWorkflow(): Workflow {
  const content = fs.readFileSync(CI_WORKFLOW_PATH, 'utf-8');
  return yaml.load(content) as Workflow;
}

function findAuditSteps(workflow: Workflow): WorkflowStep[] {
  const auditSteps: WorkflowStep[] = [];
  if (!workflow.jobs) return auditSteps;

  for (const job of Object.values(workflow.jobs)) {
    if (!job.steps) continue;
    for (const step of job.steps) {
      if (
        step.run &&
        step.run.includes('npm audit')
      ) {
        auditSteps.push(step);
      }
    }
  }
  return auditSteps;
}

describe('SEC-032: CI npm audit configuration', () => {
  it('should have the CI workflow file', () => {
    expect(fs.existsSync(CI_WORKFLOW_PATH)).toBe(true);
  });

  it('should have at least one npm audit step', () => {
    const workflow = loadWorkflow();
    const auditSteps = findAuditSteps(workflow);
    expect(auditSteps.length).toBeGreaterThan(0);
  });

  it('should NOT have continue-on-error on any audit step', () => {
    const workflow = loadWorkflow();
    const auditSteps = findAuditSteps(workflow);

    for (const step of auditSteps) {
      expect({
        stepName: step.name,
        continueOnError: step['continue-on-error'],
      }).toEqual(
        expect.objectContaining({
          continueOnError: undefined,
        })
      );
    }
  });

  it('should use --audit-level=high on all audit steps', () => {
    const workflow = loadWorkflow();
    const auditSteps = findAuditSteps(workflow);

    for (const step of auditSteps) {
      expect(step.run).toContain('--audit-level=high');
    }
  });
});
