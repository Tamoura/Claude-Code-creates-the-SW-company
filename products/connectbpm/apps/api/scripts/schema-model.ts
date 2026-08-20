/**
 * Minimal Prisma schema reader shared by the CI gates.
 *
 * Deliberately NOT a full Prisma parser: it reads the block structure and the
 * block-level attributes the tenancy gate needs. If the schema grows a
 * construct this cannot see, the gate must fail loudly rather than skip it —
 * see `assertParsed` below.
 */
import { readFileSync } from 'node:fs';

export interface PrismaIndex {
  kind: 'index' | 'unique';
  fields: string[];
  raw: string;
}

export interface PrismaModel {
  name: string;
  /** Table name after `@@map`, or the model name when unmapped. */
  table: string;
  fields: string[];
  indexes: PrismaIndex[];
  line: number;
}

const MODEL_START = /^model\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{\s*$/;
const BLOCK_END = /^\}\s*$/;
const MAP_ATTR = /^\s*@@map\("([^"]+)"\)/;
const INDEX_ATTR = /^\s*@@(index|unique)\(\s*\[([^\]]*)\]/;
const FIELD_DECL = /^\s{2,}([a-zA-Z_][A-Za-z0-9_]*)\s+\S/;

export function parseSchema(schemaPath: string): PrismaModel[] {
  const lines = readFileSync(schemaPath, 'utf-8').split('\n');
  const models: PrismaModel[] = [];

  let current: PrismaModel | null = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? '';

    if (current === null) {
      current = startModel(line, i);
      continue;
    }

    if (BLOCK_END.test(line)) {
      models.push(current);
      current = null;
      continue;
    }

    absorbLine(current, line);
  }

  assertParsed(models, schemaPath);
  return models;
}

function startModel(line: string, index: number): PrismaModel | null {
  const start = MODEL_START.exec(line);
  if (!start?.[1]) return null;
  return {
    name: start[1],
    table: start[1],
    fields: [],
    indexes: [],
    line: index + 1,
  };
}

/** Adds whatever this line contributes to the model currently being read. */
function absorbLine(model: PrismaModel, line: string): void {
  const mapped = MAP_ATTR.exec(line);
  if (mapped?.[1]) {
    model.table = mapped[1];
    return;
  }

  const index = INDEX_ATTR.exec(line);
  if (index?.[1] && index[2] !== undefined) {
    model.indexes.push({
      kind: index[1] as 'index' | 'unique',
      fields: index[2]
        .split(',')
        .map((f) => f.trim())
        .filter((f) => f.length > 0),
      raw: line.trim(),
    });
    return;
  }

  // Comments and block attributes are not fields.
  const trimmed = line.trimStart();
  if (trimmed.startsWith('//') || trimmed.startsWith('@@')) return;

  const field = FIELD_DECL.exec(line);
  if (field?.[1]) model.fields.push(field[1]);
}

/**
 * A parser that silently reads zero models would make every downstream
 * assertion vacuously true. That failure mode is exactly what these gates
 * exist to prevent, so it is an error, not a warning.
 */
function assertParsed(models: PrismaModel[], schemaPath: string): void {
  if (models.length === 0) {
    throw new Error(
      `Parsed 0 models from ${schemaPath}. The gate cannot verify a schema it ` +
        `could not read — refusing to report a pass.`
    );
  }
  for (const model of models) {
    if (model.fields.length === 0) {
      throw new Error(
        `Model ${model.name} (line ${model.line}) parsed with 0 fields. ` +
          `Refusing to report a pass on a schema the gate cannot read.`
      );
    }
  }
}

export function isTenantScoped(model: PrismaModel): boolean {
  return model.fields.includes('tenantId');
}
