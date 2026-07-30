# ADR-0003: Internal event bus for cross-cutting concerns, direct calls for request/response

- **Status**: accepted
- **Date**: 2026-07-30
- **Phase**: 0 — Architecture & Contracts Foundation
- **Deciders**: Core maintainers

## Context

The copilot is a set of engines — orchestration, planning, prompt, model
gateway, tooling, plugin host, knowledge, evidence, reporting, policy, audit,
telemetry, storage, UI gateway — running **in one process**. They have to talk to
each other. Two extremes were on the table.

*Everything through an event bus.* Attractive because it decouples everybody,
and because an event stream is exactly what the audit log wants. But
request/response over a bus is miserable: the caller has to invent a correlation
id, register a one-shot subscriber, invent a timeout, and reconstruct the error.
Type safety evaporates (`publish(name, payload: unknown)`), stack traces stop at
the bus, and back-pressure disappears — a planner can flood the model gateway
because nothing pushes back. Debugging "who answered this?" becomes archaeology.

*Everything through direct calls.* Type-safe, debuggable, natural back-pressure,
trivial errors. But every engine that produces something interesting then has to
know about every engine that cares. Orchestration would import the audit engine,
the telemetry engine and the UI gateway just to tell them a step finished. That
is exactly the coupling that makes systems impossible to extend, and it puts
optional concerns (telemetry) on the critical path of essential ones.

There is a third force specific to this product: **the audit trail must be
complete and must not be the responsibility of the code being audited.** If the
orchestration engine has to remember to write an audit record, then the day
somebody forgets, the record is silently missing. If audit is a *subscriber*, it
observes everything by construction.

## Decision

We use **both**, with a hard boundary.

### Direct calls (typed, in-process function calls) for request/response

Use a direct call when the caller **needs a result, or needs to know it worked**:

- orchestration → model gateway (`model.completion.create`)
- orchestration → tooling / plugin host (`tool.invoke`)
- any engine → policy engine (`policy.scope.check`)
- any engine → storage repositories
- prompt engine → knowledge engine (`knowledge.retrieve`)

Shape: `EngineClient.call(target, operation, request, options)` returning
`Result<Res, ContractError>` (`packages/contracts/src/messaging/engine.ts`).
Calls are described by an `EngineOperation` carrying request/response schemas, an
`idempotent` flag and a default timeout. Callers get real stack traces, real
timeouts (`AbortSignal`), real back-pressure and typed errors.

### Events (in-process pub/sub) for cross-cutting concerns

Publish an event when the producer **does not care who listens and must not be
blocked by them**:

- audit logging
- telemetry (metrics, spans)
- UI/live-view updates
- session progress notifications
- policy monitors watching for scope drift
- plugin reactions to lifecycle changes

Shape: `EventBus.publish(EventEnvelope)` and
`EventBus.subscribe(pattern, handler)`
(`packages/contracts/src/messaging/event-bus.ts`). Guarantees fixed by the
contract:

1. Events are **facts in the past tense** (`session.step.completed`). An event
   may never be used to ask for work.
2. Per-`subject` ordering per subscriber; no global ordering.
3. A throwing subscriber never affects the publisher or other subscribers;
   failures go to `onSubscriberError`.
4. Handlers run after the publisher's turn (async by default) so publishing
   cannot re-enter the publisher's own state.
5. `publish` resolves when the event is *accepted*, not when handlers finish —
   subscribers must never apply back-pressure to producers. `publishAndWait`
   exists for tests and shutdown flushes only.
6. At-most-once **in memory**. Durability is the audit subscriber's job.

### The rule of thumb

> If the caller would be *wrong* to continue without the answer, it is a call.
> If the caller would be *right* to continue regardless, it is an event.

### Both paths share one envelope

`RequestEnvelope`, `ResponseEnvelope`, `EventEnvelope` and
`StreamChunkEnvelope` are variants of one `EngineMessage` union with a common
header (`correlationId`, `causationId`, `sessionId`, `actor`, trace context,
sensitivity, redactions). Direct calls still materialise an envelope, so the
audit and telemetry subscribers see the same record shape for both paths, and so
moving an engine to a worker thread later is a transport change, not a contract
change.

### What is explicitly forbidden

- Commands on the bus (`*.please-do-x`) — that is a call.
- Events in the imperative or present tense.
- Reading an event's return value (there isn't one).
- Engines importing each other's implementation modules; they may import only
  `@aiptc/contracts` and receive collaborators through `EngineRuntimeContext`.
- The audit engine calling back into the engine that produced an event.

## Consequences

### Positive

- Work paths stay typed, debuggable and back-pressured.
- Audit and telemetry are complete by construction and removable without
  touching business code.
- Adding a consumer (a live UI, a scope monitor, a plugin) needs no change in
  the producer.
- One envelope means one audit writer, one redaction implementation, one replay
  format.

### Negative / costs

- Two mechanisms to learn, and a judgement call at every new interaction — this
  ADR's rule of thumb and the "forbidden" list exist to keep that judgement
  cheap.
- Event ordering guarantees are weaker than a call chain; anything that needs
  strict causality must use calls or the `subject`/`sequence` fields.
- Publishing an event *and* returning a value duplicates information in the
  audit log. Accepted: the duplication is cheap and the alternative is a
  missing trail.

### Neutral

- The bus is in-process for now. The envelope is transport-independent, so a
  future worker-thread or socket transport is an implementation detail.

## Alternatives considered

| Option | Why not |
| ------ | ------- |
| Bus-only (event sourcing for everything) | Request/response over a bus loses types, stack traces, timeouts and back-pressure; enormous accidental complexity for an in-process app. |
| Calls-only | Producers must know every consumer; audit becomes opt-in and therefore incomplete; telemetry lands on the critical path. |
| External broker (Redis/NATS) | Adds an operational dependency to a local-first, offline-capable security tool. |
| Node's `EventEmitter` as the bus | No envelope, no patterns, no error isolation, no async guarantees, no typing. We may *implement* the bus on top of it, but not expose it. |

## Compliance

- `packages/contracts/src/messaging/engine.ts` (calls) and
  `event-bus.ts` (events) are separate interfaces; neither can express the
  other's semantics — `publish` returns only a delivery count, `call` has no
  broadcast form.
- `EVENT_CATALOG` in `packages/contracts/src/messaging/events.ts` is the closed
  list of legal event names; `test/messaging.test.ts` asserts every name is
  well-formed, catalogued and past-tense-shaped, and that security-relevant
  events are marked `audited`.
- Code review: a pull request adding an event whose name contains an imperative
  verb, or a direct call for telemetry, violates this ADR.
