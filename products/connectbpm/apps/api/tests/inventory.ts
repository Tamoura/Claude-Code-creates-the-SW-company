/**
 * Endpoint inventories — the OpenAPI document and the live router.
 *                                              ADR-004 §4 · AC-049 · AC-050
 *
 * ADR-004 §4 makes the isolation suite enumerate its targets FROM THE OPENAPI
 * DOCUMENT rather than from a hand-maintained list. That is the whole reason
 * "a new endpoint is covered automatically" is true rather than aspirational:
 * a list someone has to remember to extend is a list that will be short by
 * exactly the endpoint that leaks.
 *
 * Two inventories, deliberately:
 *   - the CONTRACT   (docs/api-contract.yaml) — what the API promises to be;
 *   - the ROUTER     (the Fastify instance)   — what it currently is.
 * Comparing them is API9 / T028; the isolation suite needs both because it
 * probes what is IMPLEMENTED and classifies from what is DOCUMENTED.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { FastifyInstance } from 'fastify';

export interface ContractOperation {
  path: string;
  method: string;
  operationId: string | null;
  /**
   * `security: []` on an operation overrides the document's global security —
   * it is the machine-readable statement "this endpoint is unauthenticated".
   * Everything else resolves to a `(tenant, membership)` and is therefore a
   * cross-tenant probe target. Classifying from the document rather than from
   * a list in this file is the point.
   */
  isPublic: boolean;
}

const HTTP_METHODS = new Set(['get', 'put', 'post', 'delete', 'patch', 'head', 'options']);

/**
 * A narrow reader for the `paths:` section, not a YAML parser.
 *
 * `yaml` is not a declared dependency of this package and resolving the one
 * hoisted at the workspace root would be a phantom dependency — the sort that
 * works until someone runs an isolated install. The document's `paths:` block
 * has a fixed two-level shape, so this reads exactly that and `assertParsed`
 * refuses to report a pass on a document it could not read. A gate that
 * silently parses zero endpoints asserts nothing about all of them.
 */
class ContractReader {
  readonly operations: ContractOperation[] = [];
  private path: string | null = null;
  private current: ContractOperation | null = null;

  /** Returns false once the `paths:` block has ended. */
  read(line: string): boolean {
    if (/^[a-zA-Z]/.test(line)) return false; // next top-level key

    const path = /^ {2}(\/\S*):\s*$/.exec(line)?.[1];
    if (path !== undefined) {
      this.flush();
      this.path = path;
      return true;
    }

    const method = /^ {4}([a-z]+):\s*$/.exec(line)?.[1];
    if (method !== undefined && HTTP_METHODS.has(method) && this.path !== null) {
      this.flush();
      this.current = {
        path: this.path,
        method: method.toUpperCase(),
        operationId: null,
        isPublic: false,
      };
      return true;
    }

    this.annotate(line);
    return true;
  }

  private annotate(line: string): void {
    if (this.current === null) return;
    const operationId = /^ {6}operationId:\s*(\S+)\s*$/.exec(line)?.[1];
    if (operationId !== undefined) this.current.operationId = operationId;
    if (/^ {6}security:\s*\[\s*\]\s*$/.test(line)) this.current.isPublic = true;
  }

  flush(): void {
    if (this.current !== null) this.operations.push(this.current);
    this.current = null;
  }
}

export function parseContract(contractPath: string): ContractOperation[] {
  const reader = new ContractReader();
  let inPaths = false;

  for (const line of readFileSync(contractPath, 'utf-8').split('\n')) {
    if (!inPaths) {
      inPaths = /^paths:\s*$/.test(line);
      continue;
    }
    if (!reader.read(line)) break;
  }
  reader.flush();

  assertParsed(reader.operations, contractPath);
  return reader.operations;
}

function assertParsed(operations: ContractOperation[], contractPath: string): void {
  if (operations.length < 50) {
    throw new Error(
      `Read only ${operations.length} operations from ${contractPath}. The ` +
        `contract is the isolation suite's target list (ADR-004 §4); refusing ` +
        `to report a pass over a document this could not read.`
    );
  }
  const withoutId = operations.filter((o) => o.operationId === null);
  if (withoutId.length > 0) {
    throw new Error(
      `${withoutId.length} operation(s) have no operationId, starting with ` +
        `${withoutId[0]?.method} ${withoutId[0]?.path}. Either the document is ` +
        `incomplete or this reader has stopped understanding its shape.`
    );
  }
}

export interface RouterRoute {
  method: string;
  url: string;
}

/**
 * The routes actually registered on a built app.
 *
 * Fastify has no public route-enumeration API, so this reads `printRoutes`,
 * which is public and stable. `parsePrintedRoutes` is asserted against routes
 * the caller knows exist, so a format change fails the build rather than
 * silently reporting an empty router — which would make every coverage
 * assertion below vacuously true.
 */
export function routerRoutes(app: FastifyInstance): RouterRoute[] {
  return parsePrintedRoutes(app.printRoutes({ commonPrefix: false }));
}

/** `└── ` and `├── ` — the connector that ends a node's indentation. */
const CONNECTOR = '\u2500\u2500 ';
const NODE = /^(\S+) \(([A-Z, ]+)\)\s*$/;

/**
 * The printed tree indents four characters per level and encodes the URL as the
 * concatenation of a node's ancestors. Depth is measured from the connector's
 * position rather than with a nested regex quantifier, which would be a ReDoS
 * shape over caller-influenced text.
 */
export function parsePrintedRoutes(printed: string): RouterRoute[] {
  const routes: RouterRoute[] = [];
  const segments: string[] = [];

  for (const line of printed.split('\n')) {
    const marker = line.lastIndexOf(CONNECTOR);
    const labelStart = marker === -1 ? 0 : marker + CONNECTOR.length;
    if (labelStart % 4 !== 0) continue;

    const node = NODE.exec(line.slice(labelStart));
    if (node?.[1] === undefined || node[2] === undefined) continue;

    const depth = Math.max(0, labelStart / 4 - 1);
    segments.length = depth;
    segments[depth] = node[1];

    const url = segments.join('');
    for (const method of node[2].split(',').map((m) => m.trim())) {
      routes.push({ method, url });
    }
  }
  return routes;
}

export const CONTRACT_PATH = join(
  __dirname, '..', '..', '..', 'docs', 'api-contract.yaml'
);

/** Turns `/v1/instances/{id}` into `/v1/instances/:id` for router comparison. */
export function toRouterUrl(contractPath: string): string {
  return contractPath.replace(/\{([^}]+)\}/g, ':$1');
}
