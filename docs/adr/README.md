# Architecture Decision Records

Decisions are numbered, dated and immutable. To change one, add a new ADR that
supersedes it (see [ADR-0001](0001-record-architecture-decisions.md)).

| ADR | Title | Status | Phase |
| --- | ----- | ------ | ----- |
| [0001](0001-record-architecture-decisions.md) | Record architecture decisions | accepted | 0 |
| [0002](0002-contracts-package-with-zod-as-source-of-truth.md) | A single `@aiptc/contracts` package, with Zod as the source of truth | accepted | 0 |
| [0003](0003-event-bus-vs-direct-calls.md) | Internal event bus for cross-cutting concerns, direct calls for request/response | accepted | 0 |
| [0004](0004-storage-abstraction-repository-pattern.md) | Storage behind the repository pattern | accepted | 0 |
| [0005](0005-session-as-root-aggregate.md) | The Session is the root aggregate, with an explicit state machine and a frozen scope | accepted | 0 |
| [0006](0006-prompt-modules-versioned-and-composable.md) | Prompts are versioned, composable modules with a declared I/O contract | accepted | 0 |
| [0007](0007-one-envelope-and-one-error-shape.md) | One message envelope and one error shape for every boundary | accepted | 0 |
| [0008](0008-plugins-are-capability-scoped.md) | Plugins declare capabilities; the host grants them, structurally | accepted | 0 |
| [0009](0009-model-provider-interface.md) | One narrow model-provider interface, capability-declared and secret-free | accepted | 0 |
| [0010](0010-schema-versioning-and-compatibility.md) | Versioning and compatibility policy for contracts | accepted | 0 |
| [0011](0011-identifiers-time-and-redaction.md) | Prefixed ULID identifiers, offset-aware timestamps, declared redaction | accepted | 0 |
| [0012](0012-authorization-scope-and-safety-in-the-contracts.md) | Authorisation, scope and safety live in the contracts, default-deny | accepted | 0 |

Template: [0000-adr-template.md](0000-adr-template.md).

## Reading order for newcomers

1. **0003** — how engines talk to each other. Everything else assumes it.
2. **0002** — where contracts live and how they are generated.
3. **0005**, **0006**, **0007**, **0008**, **0009** — the five foundational
   contracts, one ADR each.
4. **0004**, **0010**, **0011**, **0012** — storage, versioning, identifiers and
   the safety model.
