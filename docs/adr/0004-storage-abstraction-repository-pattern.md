# ADR-0004: Storage behind the repository pattern

- **Status**: accepted
- **Date**: 2026-07-30
- **Phase**: 0 — Architecture & Contracts Foundation
- **Deciders**: Core maintainers

## Context

The copilot is local-first: an engagement's sessions, findings, evidence and
audit log live on the tester's machine. SQLite plus local files is the obvious
first implementation — zero setup, transactional, fast, greppable.

But "local" is not one thing. Depending on deployment we may later want an
encrypted embedded store, a DuckDB file for analytics, an in-memory store for
tests and demos, or a per-engagement encrypted container that can be handed to a
client. If engines contain SQL, every one of those becomes a rewrite. Storage
choice must not be visible above the storage boundary.

There is also a correctness force. Multiple engines mutate the same session
concurrently (orchestration advances steps, evidence attaches artifacts, policy
pauses the run). Without an explicit concurrency rule in the contract, we get
lost updates.

## Decision

Engines never see a driver, SQL, a file path or a connection. They see three
ports, defined in `packages/contracts/src/storage/repository.ts`:

- **`Repository<T>`** — typed CRUD + declarative queries over a canonical
  collection (`COLLECTIONS`). Plus `AppendOnlyRepository<AuditRecord>` for the
  audit log, which has no update and no delete and can verify its hash chain.
- **`BlobStore`** — content-addressed bytes behind `blob://sha256/<digest>`
  URIs; `Artifact.content` points into it. Big payloads never live in rows.
- **`KeyValueStore`** — small non-relational state (cursors, caches, plugin
  private state) with an atomic `compareAndSet`.

All three are reached through one injected **`StorageProvider`**, which also
carries `withTransaction` (`UnitOfWork`), `migrate()`, `health()` and a
streaming `export()`.

Rules baked into the types:

- **Caller-assigned ids.** Ids are minted before persistence (ADR-0011), so an
  entity can be referenced before it is stored and replays are deterministic.
- **Optimistic concurrency, never locks.** Every write accepts
  `expectedRevision`; a mismatch fails with `storage_conflict`. `expectedRevision: 0`
  asserts "must not exist". `Session.revision` is part of the public contract
  for exactly this reason.
- **Queries are data, not callbacks** (`QuerySpec` with `where` / `any` /
  `sort` / `page` / `select`), so any backend can translate them and nothing can
  smuggle a JavaScript predicate into a future SQL backend.
- **Cursor pagination only.** Offsets break under concurrent appends and differ
  between backends.
- **`Result`, not exceptions**, for expected failures (conflict, not found,
  unavailable).
- **Soft delete by default**; `hard: true` is explicit. Evidence should be hard
  to lose by accident.
- **No lazy loading, no proxies, no ORM entities.** Entities are plain JSON
  objects that already have a published contract.

The SQLite/local-file implementation lands in a later phase as
`@aiptc/storage-sqlite`, implementing `StorageProvider` and nothing more.

## Consequences

### Positive

- Swapping the backend is one package, and the contracts test suite is the
  conformance suite it must pass.
- Tests can run against an in-memory implementation with no I/O.
- Concurrency semantics are stated once, in the type, rather than rediscovered
  per engine.
- Because entities are plain JSON matching published schemas, "export this
  engagement" is a streaming dump, not a serialisation project.

### Negative / costs

- The declarative query language is deliberately less expressive than SQL.
  Backend-specific analytics (report aggregation, dashboards) will need either
  new first-class query capabilities or a reporting-side read model — a
  conscious trade to keep engines portable.
- Optimistic concurrency pushes retry logic onto callers; the shared
  `retryable` flag on `ContractError` keeps that uniform.
- An extra indirection layer to implement before anything can be stored.

### Neutral

- Migrations are the storage implementation's business; the contract only
  requires `migrate()` to be idempotent and to report what it applied.

## Alternatives considered

| Option | Why not |
| ------ | ------- |
| Call SQLite directly from engines | Fast to start, then permanent. Every engine would encode schema knowledge and the "swap the store" requirement would be dead on arrival. |
| A full ORM (Prisma, TypeORM, Drizzle) | Couples the domain model to a driver's code generation and migration story, drags entity semantics (lazy loading, identity maps) into engines, and still has to be hidden behind an interface for testability. An ORM may be used *inside* the implementation. |
| Event sourcing as the primary store | Attractive for auditability (we get some of it via the append-only audit log), but forces every read path through projections — too much machinery for Phase 0, and not needed since the audit log already gives forensic history. |
| Generic `get/put(key, json)` only | Too weak: no queries, no pagination, no concurrency control; every engine would reinvent them. |

## Compliance

- Nothing outside a storage implementation package may import a database
  driver. `test/no-engine-logic.test.ts` enforces this for the contracts
  package itself; later phases add the same guard per engine package.
- Every write path in later phases must pass `expectedRevision` when updating a
  previously read entity; reviews should reject blind `upsert` of stale state.
