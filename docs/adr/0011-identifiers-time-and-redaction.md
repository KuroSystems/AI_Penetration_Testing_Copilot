# ADR-0011: Prefixed ULID identifiers, offset-aware timestamps, declared redaction

- **Status**: accepted
- **Date**: 2026-07-30
- **Phase**: 0 — Architecture & Contracts Foundation
- **Deciders**: Core maintainers

## Context

Three small decisions that are painful to change once data exists, and that
every contract depends on: how entities are identified, how time is recorded,
and how sensitive values are marked.

For a security tool these are not cosmetic. Ids appear in client-facing reports
and in audit trails. Timestamps must be comparable across machines and time
zones for an incident timeline. And a copilot inevitably handles credentials,
tokens, PII from a target and raw exploit payloads — the audit log must be
useful without becoming a second copy of everything sensitive.

## Decision

### Identifiers

- Format: `<prefix>_<ULID>` (UUID also accepted, for imported data).
- Prefixes are enumerated in `ID_PREFIXES` (`ses`, `stp`, `fnd`, `evd`, `art`,
  `pmd`, `msg`, `plg`, …) and each entity type gets its own schema, so passing a
  finding id where a session id belongs is a **validation error**, not a debugging
  session.
- ULID by default: lexicographically sortable by creation time (tight SQLite
  indexes, natural ordering in logs), Crockford base32, case-safe.
- **Ids are minted by the caller**, before persistence (ADR-0004), so entities
  can reference each other before being stored and so replays are deterministic.
- Ids are opaque: consumers may read the prefix and nothing else.

### Time

- Every timestamp is RFC 3339 with an explicit offset; naive local timestamps
  are rejected by the schema. UTC (`Z`) is the norm.
- Durations are integer milliseconds (`DurationMs`), never floats or strings.
- Human-facing time zone lives in `Session.timezone` as an IANA name; it is a
  presentation concern only.
- Engines read time from an injected `Clock` (`monotonicMs` for durations,
  `now()` for wall clock) so behaviour is deterministic under test and replay.
  The contracts package itself contains no clock access at all.

### Sensitivity and redaction

- `Sensitivity` (`public → secret`) classifies any payload or field and gates
  both model egress (ADR-0009) and export.
- `RedactionRule` pairs an RFC 6901 JSON Pointer with a strategy
  (`none | mask | hash | drop | tokenize`) and an optional reason.
- Redactions travel **in the message header** (ADR-0007) and on artifacts, so
  the audit and telemetry sinks apply them before persisting. Producers declare
  what is sensitive; sinks enforce. Neither side has to guess.

## Consequences

### Positive

- Self-describing ids make logs, envelopes and reports readable, and mis-wired
  fields fail at the boundary.
- Time-sortable ids give cheap chronological ordering without an index on
  `createdAt`.
- A single, declarative redaction mechanism instead of ad-hoc `password` string
  matching in a logger.

### Negative / costs

- Ids are longer than a bare UUID and appear in URLs and reports.
- ULID generation must be monotonic within a millisecond to keep ordering
  useful; the implementation must use a proper library.
- Declaring redactions is work the producer must remember; the review rule is
  that any payload containing credentials, tokens or raw target data must carry
  a rule or a `sensitivity` above `internal`.

### Neutral

- UUIDs are accepted so external tooling can import data without rewriting ids.

## Alternatives considered

| Option | Why not |
| ------ | ------- |
| Bare UUIDv4 | No ordering, no type information, indistinguishable in logs. |
| Auto-increment integers | Leak volume, collide across machines and exports, and cannot be minted before insert. |
| Store-assigned ids | Prevents referencing an entity before it is persisted and makes deterministic replay impossible. |
| Epoch-millisecond numbers for time | Unreadable in stored JSON, ambiguous precision, no offset. |
| Redaction by field-name heuristics in the logger | Silently misses anything not named `password`, and cannot express "hash this" vs "drop this". |

## Compliance

- Per-entity id schemas are used everywhere; the negative fixture
  `Session / wrong-id-prefix` proves cross-type ids are rejected.
- The negative fixture `Session / naive-timestamp` proves offset-less timestamps
  are rejected.
- `test/no-engine-logic.test.ts` fails if the contracts package ever calls
  `Date.now()`, `new Date()` or `Math.random()`.
