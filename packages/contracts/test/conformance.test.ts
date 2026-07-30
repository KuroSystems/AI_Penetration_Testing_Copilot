import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CONTRACTS, CONTRACTS_BY_ID, validateContract } from '../src/registry.js';
import { EXAMPLES } from '../src/examples.js';
import { INVALID_FIXTURES } from './fixtures/invalid.js';
import { SAMPLE_DIR, buildAjv, compileFor, readSchemaIndex } from './helpers/ajv.js';

const ajv = buildAjv();

describe('acceptance: every published contract has at least one sample payload', () => {
  const covered = new Set(EXAMPLES.map((e) => e.contract));
  for (const contract of CONTRACTS) {
    it(`${contract.id} has a sample`, () => {
      expect(covered.has(contract.id), `${contract.id} needs an example in src/examples.ts`).toBe(true);
    });
  }
});

describe('acceptance: Zod schemas validate every sample payload', () => {
  for (const example of EXAMPLES) {
    it(`${example.contract} / ${example.name}`, () => {
      const result = validateContract(example.contract, example.value);
      if (!result.ok) {
        throw new Error(`${example.contract}/${example.name} failed:\n${JSON.stringify(result.issues, null, 2)}`);
      }
      expect(result.ok).toBe(true);
    });
  }
});

describe('acceptance: generated JSON Schemas validate every sample payload', () => {
  for (const example of EXAMPLES) {
    it(`${example.contract} / ${example.name}`, () => {
      const validate = compileFor(ajv, example.contract);
      const valid = validate(JSON.parse(JSON.stringify(example.value)));
      if (!valid) {
        throw new Error(
          `${example.contract}/${example.name} failed JSON Schema validation:\n${JSON.stringify(validate.errors, null, 2)}`,
        );
      }
      expect(valid).toBe(true);
    });
  }
});

describe('acceptance: committed sample files match the typed examples', () => {
  for (const example of EXAMPLES) {
    it(`samples/${example.contract}.${example.name}.json`, () => {
      const path = join(SAMPLE_DIR, `${example.contract}.${example.name}.json`);
      expect(existsSync(path), `${path} missing — run \`npm run samples\``).toBe(true);
      expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual(JSON.parse(JSON.stringify(example.value)));
    });
  }
});

describe('invalid payloads are rejected by Zod and by JSON Schema', () => {
  for (const fixture of INVALID_FIXTURES) {
    it(`${fixture.contract} / ${fixture.name} — ${fixture.because}`, () => {
      const zodResult = validateContract(fixture.contract, fixture.value);
      expect(zodResult.ok, 'Zod accepted an invalid payload').toBe(false);

      const validate = compileFor(ajv, fixture.contract);
      const jsonSchemaValid = validate(JSON.parse(JSON.stringify(fixture.value)));
      expect(jsonSchemaValid, 'JSON Schema accepted an invalid payload').toBe(false);
    });
  }
});

describe('generated schema index', () => {
  const index = readSchemaIndex();

  it('lists exactly the registered contracts', () => {
    expect(index.contracts.map((c) => c.id).sort()).toEqual(CONTRACTS.map((c) => c.id).sort());
  });

  it('marks the five foundational Phase 0 contracts', () => {
    expect(index.contracts.filter((c) => c.foundational).map((c) => c.id).sort()).toEqual(
      ['CompletionRequest', 'EngineMessage', 'PluginManifest', 'PromptModule', 'ProviderConfig', 'Session']
        .filter((id) => CONTRACTS_BY_ID.get(id)?.foundational)
        .sort(),
    );
  });

  it('every schema file is resolvable by Ajv', () => {
    for (const entry of index.contracts) {
      expect(ajv.getSchema(entry.$id), `${entry.$id} not resolvable`).toBeTruthy();
    }
  });
});

describe('Zod and JSON Schema agree that contract objects are closed', () => {
  for (const example of EXAMPLES) {
    const value = example.value;
    if (typeof value !== 'object' || value === null || Array.isArray(value)) continue;

    it(`${example.contract} / ${example.name} rejects an undeclared property`, () => {
      const polluted = { ...(JSON.parse(JSON.stringify(value)) as Record<string, unknown>), __undeclared__: 1 };

      const zodResult = validateContract(example.contract, polluted);
      const jsonSchemaValid = compileFor(ajv, example.contract)(polluted);

      expect(zodResult.ok, 'Zod accepted an undeclared property').toBe(false);
      expect(jsonSchemaValid, 'JSON Schema accepted an undeclared property').toBe(false);
    });
  }
});
