# @aiptc/contracts

Phase 0 foundation for the AI Penetration Testing Copilot: the schemas, types
and interfaces every engine must honour.

**This package contains no engine logic.** No orchestration, no prompt
rendering, no provider calls, no storage implementation — only the shapes those
engines exchange plus pure helpers for building and validating them. A test
(`test/no-engine-logic.test.ts`) fails the build if that ever stops being true.

## Layout

```
src/
  common/      json, primitives, ids, errors, pagination
  domain/      actor, target & scope, artifact, finding & evidence
  session/     Session, SessionStep, ApprovalRequest, state machine
  prompt/      PromptModule, render request, rendered prompt
  messaging/   envelope, event catalog, EventBus, Engine/EngineClient
  plugin/      PluginManifest, PluginHost & PluginContext
  model/       ModelProvider, requests, responses, descriptors
  storage/     Repository, BlobStore, KeyValueStore, StorageProvider
  audit/       AuditRecord, MetricSample, Span, sinks
  registry.ts  the list of published contracts
  examples.ts  typed sample payloads
schemas/       generated JSON Schema 2020-12 (committed)
samples/       generated JSON sample payloads (committed)
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run build` | Compiles to `dist/` |
| `npm run typecheck` | Type-checks src, tests and scripts |
| `npm run schemas` | Regenerates `schemas/` and `samples/` |
| `npm run schemas:check` | Fails if the committed output is stale |
| `npm test` | Conformance, registry, messaging, lifecycle and no-logic suites |

## Quick start

```ts
import {
  SessionSchema, type Session,
  EngineMessageSchema,
  EVENT_NAMES,
  CONTRACTS, validateContract,
} from '@aiptc/contracts';

const parsed = SessionSchema.safeParse(input);      // runtime validation
const result = validateContract<Session>('Session', input);  // by contract id
```

JSON Schema consumers: `schemas/index.json` lists every contract, its `$id` and
its file. Shared `$defs` live in `schemas/__shared.schema.json`.

## Rules of the road

- Closed objects; use `extensions` for anything not in the contract.
- Ids are `<prefix>_<ULID>`, minted by the caller.
- Timestamps are RFC 3339 with an explicit offset.
- Failures are `Result<T, ContractError>`, not exceptions.
- No `.default()` in schemas — input and output shapes must be identical.
- Secrets are referenced (`credentialRef`), never embedded.

See [`docs/contracts.md`](../../docs/contracts.md) for the full guide and
[`docs/adr/`](../../docs/adr/) for the reasoning behind each decision.
