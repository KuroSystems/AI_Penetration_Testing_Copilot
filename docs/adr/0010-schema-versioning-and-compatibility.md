# ADR-0010: Versioning and compatibility policy for contracts

- **Status**: accepted
- **Date**: 2026-07-30
- **Phase**: 0 — Architecture & Contracts Foundation
- **Deciders**: Core maintainers

## Context

Phase 0's stated risk is that under-specified contracts cause churn later. The
mitigation chosen for the *content* of the contracts is deliberate
over-specification of optional fields. That mitigation needs a matching rule for
*change*: what may be added without breaking anyone, what forces a major bump,
and how a plugin built against an older version is handled.

Persisted data raises the stakes: an audit record written today must still be
readable when the reader has moved on two versions.

## Decision

### Versioning

- The contracts package carries one semver version (`CONTRACTS_VERSION`), and
  every top-level document embeds `schemaVersion`.
- Generated JSON Schema `$id`s are version-scoped:
  `https://schemas.aiptc.dev/contracts/v<version>/<Id>.schema.json`.
- Plugins declare `contractsRange`; providers declare `contractsVersion`. The
  host refuses to load anything outside the supported range and reports
  `plugin_incompatible`.

### What is a breaking change (major bump)

- Removing or renaming a field; narrowing a type or a constraint.
- Making an optional field required.
- Removing an enum member, or adding one to an enum that *consumers* must
  exhaustively handle (e.g. `SessionState`).
- Changing the meaning of an existing field.

### What is additive (minor bump)

- Adding an optional field.
- Adding a new contract, a new event name, a new error code.
- Adding an enum member to a *producer-side* enum that consumers already handle
  defensively (e.g. `ArtifactKind`, `ActivityClass`).
- Relaxing a constraint.

### Rules that make additive change survivable

1. **Closed objects plus an `extensions` bag.** Every top-level contract object
   is strict (`additionalProperties: false` in JSON Schema, `z.strictObject` at
   runtime — the two are tested for parity), and carries an optional
   `extensions` map keyed by `vendor:name`. Typos fail fast; genuine extension
   has a legal home. Unknown extension keys MUST be ignored, never rejected.
2. **Over-specified optionals.** Fields we anticipate needing are defined now as
   optional rather than added later as required — the explicit Phase 0
   risk mitigation.
3. **Consumers tolerate unknown enum members on producer-side enums**, and must
   never crash on an unrecognised `extensions` key or an unknown event name.
4. **Persisted documents keep their `schemaVersion`.** Readers upgrade forward;
   they never assume the current version.
5. **No `.default()` in schemas.** Defaults would make the input and output
   shapes differ, so a payload valid on the wire could be invalid against the
   published schema. Defaults are documented in prose and applied by engines.

### Deprecation

Mark a field deprecated in its description, keep it for at least one minor
release, and record the removal in an ADR that supersedes the relevant one.

## Consequences

### Positive

- Additive evolution is safe and frequent; breaking change is rare and visible.
- Plugin compatibility is a declared range, checked mechanically.
- Old audit and session records stay readable.

### Negative / costs

- Strict objects mean an old consumer rejects a payload from a *newer* producer
  that added a field — mitigated by `extensions` for anything experimental and
  by the host refusing incompatible plugin ranges in the first place.
- Carrying optional fields nobody uses yet adds noise to the schemas.

### Neutral

- Pre-1.0 the project may bump the minor for breaking changes, as semver allows;
  the classification above still governs the *communication*.

## Alternatives considered

| Option | Why not |
| ------ | ------- |
| Open objects everywhere (`additionalProperties: true`) | Forward-compatible, but typos become silent data loss — the failure mode is worse in a tool whose output is a client report. |
| Per-contract independent versions | More precise, far more bookkeeping; a single package version plus embedded `schemaVersion` is enough at this scale. |
| No versioning until 1.0 | Plugins and persisted data exist before 1.0; they need a compatibility story now. |

## Compliance

- `npm run schemas:check` fails when generated schemas or samples are stale.
- `test/conformance.test.ts` asserts Zod and JSON Schema agree that contract
  objects reject undeclared properties.
- `test/registry.test.ts` asserts `CONTRACTS_VERSION` is valid semver and that
  `$id`s are version-scoped.
