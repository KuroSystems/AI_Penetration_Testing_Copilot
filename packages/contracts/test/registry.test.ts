import { describe, expect, it } from 'vitest';
import {
  CONTRACTS,
  CONTRACTS_BY_ID,
  CONTRACTS_VERSION,
  FOUNDATIONAL_CONTRACT_IDS,
  JSON_SCHEMA_DIALECT,
  getContractSchema,
  schemaUri,
  validateContract,
} from '../src/registry.js';
import { SemVerSchema } from '../src/common/primitives.js';

describe('contract registry', () => {
  it('has unique ids', () => {
    const ids = CONTRACTS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('exposes a valid semver package version', () => {
    expect(SemVerSchema.safeParse(CONTRACTS_VERSION).success).toBe(true);
  });

  it('targets JSON Schema 2020-12', () => {
    expect(JSON_SCHEMA_DIALECT).toBe('https://json-schema.org/draft/2020-12/schema');
  });

  it('covers the five contracts Phase 0 is required to pin down', () => {
    // Session, Prompt Module, Engine-to-Engine envelope, Plugin manifest,
    // Model provider interface (its configuration + request shapes).
    expect(FOUNDATIONAL_CONTRACT_IDS).toEqual(
      expect.arrayContaining(['Session', 'PromptModule', 'EngineMessage', 'PluginManifest', 'ProviderConfig']),
    );
    expect(FOUNDATIONAL_CONTRACT_IDS.length).toBe(5);
  });

  it('resolves schemas by id and versions their $id', () => {
    expect(getContractSchema('Session')).toBeDefined();
    expect(getContractSchema('NopeNotAThing')).toBeUndefined();
    expect(schemaUri('Session')).toBe(`https://schemas.aiptc.dev/contracts/v${CONTRACTS_VERSION}/Session.schema.json`);
  });

  it('reports unknown schemas instead of throwing', () => {
    const result = validateContract('NopeNotAThing', {});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues[0]?.code).toBe('unknown_schema');
  });

  it('returns JSON-Pointer-style issue paths', () => {
    const result = validateContract('Session', { id: 'nope' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      for (const issue of result.issues) expect(issue.pointer.startsWith('/')).toBe(true);
      expect(result.issues.some((i) => i.pointer === '/id')).toBe(true);
    }
  });

  it('descriptors carry a title, description and group', () => {
    for (const contract of CONTRACTS) {
      expect(contract.title.length, contract.id).toBeGreaterThan(0);
      expect(contract.description.length, contract.id).toBeGreaterThan(10);
      expect(CONTRACTS_BY_ID.get(contract.id)).toBe(contract);
    }
  });
});
