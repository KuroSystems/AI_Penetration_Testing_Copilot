import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ajv2020Module from 'ajv/dist/2020.js';
import ajvFormatsModule from 'ajv-formats';
import type { ValidateFunction } from 'ajv';

const here = dirname(fileURLToPath(import.meta.url));
export const SCHEMA_DIR = join(here, '..', '..', 'schemas');
export const SAMPLE_DIR = join(here, '..', '..', 'samples');

/** Minimal structural view of Ajv — avoids CJS/ESM interop noise in types. */
export interface AjvLike {
  addSchema(schema: unknown, key?: string): unknown;
  addFormat(name: string, format: RegExp | ((value: string) => boolean)): unknown;
  addKeyword(definition: { keyword: string; metaSchema?: unknown; valid?: boolean }): unknown;
  getSchema(keyRef: string): ValidateFunction | undefined;
}

type AjvCtor = new (options?: Record<string, unknown>) => AjvLike;

const interop = <T>(module: T): T => (module as { default?: T }).default ?? module;

const Ajv2020 = interop(ajv2020Module) as unknown as AjvCtor;
const addFormats = interop(ajvFormatsModule) as unknown as (ajv: AjvLike) => void;

/**
 * Formats Zod emits that `ajv-formats` does not ship. Without these, Ajv would
 * silently *skip* the constraint, which would make the conformance suite weaker
 * than the Zod schemas it is meant to mirror.
 */
const EXTRA_FORMATS: Record<string, RegExp> = {
  cidrv4: /^((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\/([0-9]|[12]\d|3[0-2])$/,
  cidrv6: /^[0-9a-fA-F:.]+\/(1[01]\d|12[0-8]|\d{1,2})$/,
  ipv4: /^((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/,
};

/**
 * Builds an Ajv instance preloaded with every generated schema, so that the
 * cross-file `$ref`s (`__shared.schema.json#/$defs/...`) resolve exactly the way
 * an external consumer would resolve them from disk.
 */
export const buildAjv = (): AjvLike => {
  const ajv = new Ajv2020({
    strict: true,
    // `x-contract` is our own annotation; everything else must be legal JSON Schema.
    strictSchema: true,
    allErrors: true,
    validateFormats: true,
    allowUnionTypes: true,
  });
  addFormats(ajv);
  // `x-contract` is our own annotation keyword; declare it so strict mode keeps
  // policing everything else.
  ajv.addKeyword({ keyword: 'x-contract', metaSchema: { type: 'object' }, valid: true });
  for (const [name, pattern] of Object.entries(EXTRA_FORMATS)) ajv.addFormat(name, pattern);

  for (const file of readdirSync(SCHEMA_DIR)) {
    if (!file.endsWith('.schema.json')) continue;
    const schema = JSON.parse(readFileSync(join(SCHEMA_DIR, file), 'utf8')) as { $id: string };
    ajv.addSchema(schema, schema.$id);
  }
  return ajv;
};

export const readSchemaIndex = (): {
  contractsVersion: string;
  contracts: { id: string; file: string; $id: string; foundational: boolean; group: string }[];
} => JSON.parse(readFileSync(join(SCHEMA_DIR, 'index.json'), 'utf8'));

export const compileFor = (ajv: AjvLike, contractId: string): ValidateFunction => {
  const entry = readSchemaIndex().contracts.find((c) => c.id === contractId);
  if (!entry) throw new Error(`No generated schema for contract "${contractId}"`);
  const validate = ajv.getSchema(entry.$id);
  if (!validate) throw new Error(`Ajv could not resolve schema "${entry.$id}"`);
  return validate;
};
