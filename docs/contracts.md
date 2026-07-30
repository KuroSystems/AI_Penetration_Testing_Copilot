# Contracts guide

Everything that crosses a boundary in this system is defined in
`packages/contracts`. This page is the practical guide: what exists, how to use
it, and how to change it.

## The five foundational contracts

Phase 0 exists to pin these down before any engine is written.

| # | Contract | File | Purpose |
| - | -------- | ---- | ------- |
| 1 | `Session` | `src/session/session.ts` | Root aggregate: scope, authorisation, autonomy, budget, progress ([ADR-0005](adr/0005-session-as-root-aggregate.md)) |
| 2 | `PromptModule` | `src/prompt/prompt-module.ts` | Versioned, composable prompt unit with declared I/O and safety ([ADR-0006](adr/0006-prompt-modules-versioned-and-composable.md)) |
| 3 | `EngineMessage` | `src/messaging/envelope.ts` | Engine-to-engine envelope: request / response / event / stream ([ADR-0007](adr/0007-one-envelope-and-one-error-shape.md)) |
| 4 | `PluginManifest` | `src/plugin/manifest.ts` | Plugin contributions, runtime and capability grants ([ADR-0008](adr/0008-plugins-are-capability-scoped.md)) |
| 5 | `ProviderConfig` + `ModelProvider` | `src/model/provider.ts` | Model backend interface, capability-declared and secret-free ([ADR-0009](adr/0009-model-provider-interface.md)) |

Supporting contracts (registered and versioned all the same): `SessionStep`,
`ApprovalRequest`, `CreateSessionRequest`, `PromptRenderRequest`,
`RenderedPrompt`, `RequestEnvelope`, `ResponseEnvelope`, `EventEnvelope`,
`StreamChunkEnvelope`, `DomainEvent`, `InstalledPlugin`, `ModelDescriptor`,
`CompletionRequest`, `CompletionResponse`, `CompletionStreamEvent`,
`EmbeddingRequest`, `EmbeddingResponse`, `Actor`, `ActorRef`, `EngagementScope`,
`RulesOfEngagement`, `TargetAsset`, `AuthorizationRecord`, `Finding`,
`Evidence`, `Artifact`, `BlobRef`, `AuditRecord`, `MetricSample`, `Span`.

Interfaces (TypeScript only — no wire schema, because they are never
serialised): `EventBus`, `Engine`, `EngineClient`, `EngineRuntimeContext`,
`Logger`, `Clock`, `PluginHost`, `PluginContext`, `ModelProvider`,
`StorageProvider`, `Repository`, `AppendOnlyRepository`, `BlobStore`,
`KeyValueStore`, `UnitOfWork`, `AuditSink`, `TelemetrySink`.

## Using the contracts

### From TypeScript

```ts
import {
  SessionSchema,
  type Session,
  EVENT_NAMES,
  validateContract,
} from '@aiptc/contracts';

// Static type
const session: Session = loadFromSomewhere();

// Runtime validation at a boundary
const parsed = SessionSchema.safeParse(untrustedInput);
if (!parsed.success) return errResult(toContractError(parsed.error));

// Or by registered contract id (useful for generic dispatch)
const result = validateContract<Session>('Session', untrustedInput);
```

### From anywhere else

Generated JSON Schema 2020-12 documents are committed under
`packages/contracts/schemas/`, with `index.json` listing every contract and its
`$id`. Cross-schema references resolve to sibling files; shared definitions live
in `__shared.schema.json`.

```bash
# validate a plugin manifest in CI, no TypeScript required
ajv validate -c ajv-formats --spec=draft2020 \
  -r 'packages/contracts/schemas/__shared.schema.json' \
  -s packages/contracts/schemas/PluginManifest.schema.json \
  -d my-plugin/manifest.json
```

Realistic payloads for every contract are in `packages/contracts/samples/`.

## Conventions you must follow

1. **Closed objects.** Contract objects reject undeclared properties. Anything
   experimental goes in `extensions`, keyed `vendor:name`. Unknown extension
   keys must be ignored, never rejected.
2. **Ids are `<prefix>_<ULID>`**, minted by the caller, one schema per entity
   type ([ADR-0011](adr/0011-identifiers-time-and-redaction.md)).
3. **Timestamps are RFC 3339 with an offset.** Durations are integer
   milliseconds.
4. **Errors are `ContractError`**, returned inside `Result<T>` — not thrown, not
   bespoke ([ADR-0007](adr/0007-one-envelope-and-one-error-shape.md)).
5. **No `.default()` in schemas**, so the wire shape and the parsed shape are
   identical. Document defaults in prose; apply them in engines.
6. **Events are past tense and catalogued** in `EVENT_CATALOG`. Commands are
   direct calls, never events.
7. **Secrets are references** (`credentialRef`), never values.

## Adding or changing a contract

1. Define or edit the Zod schema in the right module under `src/`.
   Use `z.strictObject`, add `.meta({ id, title, description })` for anything
   that should appear as a named definition, and add doc comments explaining
   *why* a field exists — the comments are the contract's documentation.
2. Register it in `src/registry.ts` if it is public.
3. Add a typed example to `src/examples.ts` and list it in `EXAMPLES`
   (the conformance suite fails if a registered contract has no sample).
4. Add a negative fixture to `test/fixtures/invalid.ts` for any constraint that
   actually matters.
5. Regenerate artefacts and run the suite:

   ```bash
   npm run schemas -w @aiptc/contracts   # writes schemas/ and samples/
   npm test -w @aiptc/contracts
   ```

6. If the change alters a boundary, a guarantee or a safety control, write an
   ADR in the same pull request.
7. Classify the change against
   [ADR-0010](adr/0010-schema-versioning-and-compatibility.md) (additive vs
   breaking) and bump `CONTRACTS_VERSION` accordingly.

## What the test suite guarantees

`npm test -w @aiptc/contracts` (303 assertions today) enforces the Phase 0
acceptance criteria:

- every registered contract has at least one sample payload;
- every sample validates against **both** the Zod schema and the generated JSON
  Schema (Ajv 2020-12, strict mode, formats enabled);
- committed `samples/*.json` match the typed examples;
- invalid fixtures are rejected by both representations;
- Zod and JSON Schema agree that contract objects are closed;
- the contracts package contains **no engine logic** — no I/O, timers,
  randomness, classes or non-Zod imports;
- the session state machine is total, acyclic into `archived`, and fully
  reachable;
- every event name is well-formed, catalogued and correctly marked as audited.
