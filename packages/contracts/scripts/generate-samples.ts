#!/usr/bin/env tsx
/**
 * Emits the typed examples in `src/examples.ts` to `samples/*.json`.
 *
 * The TypeScript values are the source of truth (they are type-checked against
 * the contracts); the JSON files exist so that non-TypeScript consumers and CI
 * jobs can validate against the published JSON Schemas without a build step.
 *
 *   npm run samples         # write samples/
 *   npm run samples:check   # fail if the committed output is stale
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXAMPLES } from '../src/examples.js';
import { CONTRACTS_BY_ID } from '../src/registry.js';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'samples');
const checkOnly = process.argv.includes('--check');

const files = EXAMPLES.map((example) => {
  if (!CONTRACTS_BY_ID.has(example.contract)) {
    throw new Error(`Example "${example.name}" targets unknown contract "${example.contract}"`);
  }
  return {
    name: `${example.contract}.${example.name}.json`,
    content: `${JSON.stringify(example.value, null, 2)}\n`,
  };
});

const duplicates = files.map((f) => f.name).filter((name, index, all) => all.indexOf(name) !== index);
if (duplicates.length > 0) throw new Error(`Duplicate sample names: ${duplicates.join(', ')}`);

if (checkOnly) {
  const problems: string[] = [];
  const expected = new Set(files.map((f) => f.name));
  const actual = existsSync(outDir) ? new Set(readdirSync(outDir)) : new Set<string>();

  for (const file of files) {
    if (!actual.has(file.name)) problems.push(`missing: ${file.name}`);
    else if (readFileSync(join(outDir, file.name), 'utf8') !== file.content) problems.push(`stale:   ${file.name}`);
  }
  for (const name of actual) if (!expected.has(name)) problems.push(`orphan:  ${name}`);

  if (problems.length > 0) {
    console.error('Sample output is out of date. Run `npm run samples`.\n');
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  console.log(`Samples are up to date (${files.length} files).`);
  process.exit(0);
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
for (const file of files) writeFileSync(join(outDir, file.name), file.content, 'utf8');
console.log(`Wrote ${files.length} samples to ${outDir}`);
