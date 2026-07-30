#!/usr/bin/env tsx
/**
 * Generates JSON Schema (2020-12) files from the Zod contracts.
 *
 * Zod is the single source of truth (ADR-0002); the emitted JSON Schema is a
 * build artifact that is nonetheless committed, so that non-TypeScript
 * consumers (plugins, CI linters, editors) can use the contracts without
 * running Node.
 *
 *   npm run schemas         # write schemas/
 *   npm run schemas:check   # fail if the committed output is stale
 */
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import {
  CONTRACTS,
  CONTRACTS_VERSION,
  JSON_SCHEMA_DIALECT,
  buildJsonSchemaRegistry,
  schemaUri,
} from '../src/registry.js';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'schemas');
const checkOnly = process.argv.includes('--check');

const registry = buildJsonSchemaRegistry();

const generated = z.toJSONSchema(registry, {
  target: 'draft-2020-12',
  io: 'input',
  uri: (id) => schemaUri(id),
  // Reusable sub-schemas are inlined unless they are registered contracts,
  // which keeps every file self-contained apart from cross-contract $refs.
  reused: 'inline',
}) as { schemas: Record<string, Record<string, unknown>> };

const files: { name: string; content: string }[] = [];

/**
 * Definitions shared by more than one contract (JsonValue, ContractError, …)
 * are emitted by Zod into a single `__shared` document that the per-contract
 * files `$ref` into. Emit it verbatim so the committed schemas resolve offline.
 */
const sharedKey = '__shared';
if (generated.schemas[sharedKey]) {
  const sharedDocument = {
    $schema: JSON_SCHEMA_DIALECT,
    $id: schemaUri(sharedKey),
    title: 'Shared contract definitions',
    description: 'Definitions referenced by more than one contract schema.',
    'x-contract': { id: sharedKey, group: 'shared', contractsVersion: CONTRACTS_VERSION, foundational: false },
    ...generated.schemas[sharedKey],
  };
  files.push({ name: `${sharedKey}.schema.json`, content: `${JSON.stringify(sharedDocument, null, 2)}\n` });
}

for (const contract of CONTRACTS) {
  const schema = generated.schemas[contract.id];
  if (!schema) throw new Error(`Generator produced no schema for "${contract.id}"`);

  const document = {
    $schema: JSON_SCHEMA_DIALECT,
    $id: schemaUri(contract.id),
    title: contract.title,
    description: contract.description,
    'x-contract': {
      id: contract.id,
      group: contract.group,
      contractsVersion: CONTRACTS_VERSION,
      foundational: contract.foundational ?? false,
    },
    ...schema,
  };

  files.push({ name: `${contract.id}.schema.json`, content: `${JSON.stringify(document, null, 2)}\n` });
}

const index = {
  $schema: JSON_SCHEMA_DIALECT,
  $id: `${schemaUri('index').replace('/index.schema.json', '')}/index.json`,
  title: 'AI Penetration Testing Copilot — contract index',
  contractsVersion: CONTRACTS_VERSION,
  dialect: JSON_SCHEMA_DIALECT,
  contracts: CONTRACTS.map((c) => ({
    id: c.id,
    group: c.group,
    title: c.title,
    description: c.description,
    foundational: c.foundational ?? false,
    file: `${c.id}.schema.json`,
    $id: schemaUri(c.id),
  })),
};
files.push({ name: 'index.json', content: `${JSON.stringify(index, null, 2)}\n` });

if (checkOnly) {
  const problems: string[] = [];
  const expected = new Set(files.map((f) => f.name));
  const actual = existsSync(outDir) ? new Set(readdirSync(outDir)) : new Set<string>();

  for (const file of files) {
    const path = join(outDir, file.name);
    if (!actual.has(file.name)) {
      problems.push(`missing: ${file.name}`);
      continue;
    }
    if (readFileSync(path, 'utf8') !== file.content) problems.push(`stale:   ${file.name}`);
  }
  for (const name of actual) {
    if (!expected.has(name)) problems.push(`orphan:  ${name}`);
  }

  if (problems.length > 0) {
    console.error('JSON Schema output is out of date. Run `npm run schemas`.\n');
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  console.log(`JSON Schema output is up to date (${files.length} files).`);
  process.exit(0);
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
for (const file of files) writeFileSync(join(outDir, file.name), file.content, 'utf8');

console.log(`Wrote ${files.length} files to ${outDir}`);
