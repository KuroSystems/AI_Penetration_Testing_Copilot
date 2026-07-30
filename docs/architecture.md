# Architecture overview (Phase 0)

> Status: Phase 0 defines **contracts only**. No engine is implemented yet.
> Every box below is a *planned* engine; what exists today is the interface it
> must honour.

## Shape of the system

The copilot is a single local process hosting a set of engines. Engines never
import each other; they receive collaborators through `EngineRuntimeContext` and
communicate in exactly two ways (ADR-0003).

```
                            ┌──────────────────────────┐
   operator ───────────────►│      UI / CLI gateway    │
                            └────────────┬─────────────┘
                                         │ direct calls
                            ┌────────────▼─────────────┐
                            │      Orchestration       │◄────────┐
                            │  (session state machine) │         │
                            └───┬───────┬───────┬──────┘         │
              direct calls      │       │       │                │
        ┌───────────────────────┘       │       └────────────┐   │
        ▼                               ▼                    ▼   │
┌───────────────┐              ┌─────────────────┐   ┌───────────┴───┐
│ Prompt engine │              │  Model gateway  │   │    Planning   │
│  (modules,    │─────────────►│ ModelProvider   │   │               │
│   rendering)  │  RenderedPrompt │  impls        │   └───────────────┘
└───────┬───────┘              └────────┬────────┘
        │                               │
        │            ┌──────────────────┴──────────┐
        ▼            ▼                             ▼
┌───────────────┐  ┌─────────────────┐   ┌───────────────────┐
│   Knowledge   │  │ Tooling / Plugin│   │      Policy       │
│               │  │      host       │──►│ scope, ROE, gates │
└───────────────┘  └────────┬────────┘   └───────────────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ Evidence &      │
                   │ Reporting       │
                   └────────┬────────┘
                            │
   ══════════════ events (pub/sub, fire-and-forget) ══════════════
        │                        │                       │
        ▼                        ▼                       ▼
┌───────────────┐      ┌──────────────────┐    ┌──────────────────┐
│  Audit engine │      │    Telemetry     │    │  Live UI updates │
│ append-only,  │      │ metrics / spans  │    │                  │
│ hash-chained  │      └──────────────────┘    └──────────────────┘
└───────┬───────┘
        ▼
┌──────────────────────────────────────────────────────────────────┐
│ StorageProvider:  Repository<T> · AppendOnlyRepository · BlobStore│
│                   · KeyValueStore · UnitOfWork                    │
│ (first implementation: SQLite + local files — swappable)          │
└──────────────────────────────────────────────────────────────────┘
```

## The two communication paths

| | Direct call | Event |
| --- | --- | --- |
| Contract | `EngineClient.call(target, operation, req)` | `EventBus.publish(EventEnvelope)` |
| Returns | `Result<Res, ContractError>` | delivery count only |
| Used for | work the caller needs the result of | facts the producer does not care who consumes |
| Coupling | caller knows the operation | producer knows nothing about consumers |
| Errors | returned to the caller | isolated, routed to `onSubscriberError` |
| Back-pressure | natural (awaited) | none — subscribers must never block producers |
| Examples | `model.completion.create`, `tool.invoke`, `policy.scope.check`, repository reads/writes | `session.step.completed`, `policy.decision.denied`, `model.call.completed`, `audit.record.appended` |

Rule of thumb: **if the caller would be wrong to continue without the answer, it
is a call; if it would be right to continue regardless, it is an event.**
Full reasoning and the list of forbidden patterns: [ADR-0003](adr/0003-event-bus-vs-direct-calls.md).

Both paths share one envelope (`EngineMessage`), so audit, telemetry, redaction
and replay have exactly one format to understand ([ADR-0007](adr/0007-one-envelope-and-one-error-shape.md)).

## Engines and their planned responsibilities

| Engine | Responsibility | Serves (calls) | Publishes (events) |
| --- | --- | --- | --- |
| `orchestration` | Session state machine, step scheduling, budgets | `session.*` | `session.*`, `approval.*` |
| `planning` | Turns objectives into steps | `plan.*` | `session.step.planned` |
| `prompt` | Prompt module registry, composition, rendering | `prompt.render` | — |
| `model-gateway` | Provider registry, routing, retries, fallback, cost | `model.completion.create`, `model.embedding.create` | `model.call.*` |
| `tooling` / `plugin-host` | Tool registry, sandboxing, invocation | `tool.invoke`, `plugin.*` | `tool.call.*`, `plugin.*` |
| `knowledge` | Methodologies, checklists, retrieval | `knowledge.retrieve` | — |
| `evidence` | Artifact capture, custody, evidence linkage | `evidence.*` | `evidence.artifact.stored` |
| `reporting` | Findings → deliverables | `report.*` | — |
| `policy` | Scope, rules of engagement, approval gates, egress | `policy.*` | `policy.*` |
| `audit` | Append-only, hash-chained record (subscriber only) | — | `audit.record.appended` |
| `telemetry` | Metrics and spans (subscriber only) | — | `telemetry.*` |
| `storage` | `StorageProvider` implementation | repository ports | `storage.entity.*` |
| `ui-gateway` | Operator interface | — | — |

## Safety model in one page

- Nothing runs without an `AuthorizationRecord`; only `draft` sessions may lack
  one.
- Scope is **default-deny, deny-first**; a target matching no rule is out of
  scope.
- Every executable thing declares an `ActivityClass`; the session's
  `RulesOfEngagement` decides whether that class is allowed, needs approval, or
  is forbidden.
- Autonomy (`advisory → autonomous`, plus `dry-run`) is a session field, and
  `dry-run` is honoured contractually by tools.
- Data egress is gated by `Sensitivity` on payloads against `maxSensitivity` /
  `hosting` on models and plugins.
- Target-controlled text entering a prompt is declared `untrusted` and
  sanitised.
- Denials are audited, explainable events — not silent failures.

Details: [ADR-0012](adr/0012-authorization-scope-and-safety-in-the-contracts.md).

## Storage boundary

Engines see `Repository<T>`, `BlobStore`, `KeyValueStore` and `UnitOfWork` — never
SQL, files or a driver. Writes use optimistic concurrency (`expectedRevision`),
queries are declarative data, pagination is cursor-based, and the audit log is a
separate append-only port with hash-chain verification.
Details: [ADR-0004](adr/0004-storage-abstraction-repository-pattern.md).

## What Phase 0 deliberately does *not* decide

- Scope pattern-matching semantics (the policy engine will specify them).
- The concrete SQLite schema and migration strategy.
- Which template dialect the prompt engine implements first.
- Retry, fallback and routing policy in the model gateway.
- UI technology.

These are implementation choices that the contracts intentionally leave open.
