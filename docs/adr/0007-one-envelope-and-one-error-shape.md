# ADR-0007: One message envelope and one error shape for every boundary

- **Status**: accepted
- **Date**: 2026-07-30
- **Phase**: 0 — Architecture & Contracts Foundation
- **Deciders**: Core maintainers

## Context

ADR-0003 splits engine communication into direct calls and events. Without a
further decision, each path would grow its own metadata: calls would pass an
options bag, events would pass headers, plugins would invent their own, and the
model gateway would surface provider errors verbatim. The audit engine would then
need one adapter per path, correlation would be best-effort, and every caller
would string-match error messages to decide whether to retry.

## Decision

**One envelope.** `EngineMessage` is a discriminated union of `request`,
`response`, `event` and `stream` over a shared header
(`packages/contracts/src/messaging/envelope.ts`). The header always carries:

- `id`, `name`, `source`, `createdAt`
- `correlationId` (the whole logical operation) and `causationId` (the direct
  parent message) — so any chain can be reconstructed as a tree
- `sessionId`, `actor`, W3C `trace` context
- `deliveryMode`, `idempotencyKey`, `attempt`, `ttlMs`, `priority`
- `payloadSchema` (id + version) so a receiver can validate without guessing
- `sensitivity` and `redactions` (JSON Pointers + strategy) so audit and
  telemetry sinks know what to mask *before* persisting

Direct calls materialise an envelope even though nothing serialises it, because
that is what makes the audit record identical on both paths and what makes a
future out-of-process transport a non-event.

**One error shape.** `ContractError`
(`packages/contracts/src/common/errors.ts`) is returned by engines, plugins,
model providers and repositories alike:

- a closed `code` enum spanning contract, authorisation/safety, resource, model,
  storage and plugin failures
- `retryable` + `retryAfterMs` so backoff is uniform and never inferred from
  prose
- `source`, `reference`, `occurredAt` for tracing
- `details` (JSON-Pointer field errors) for validation failures
- `vendorCode` and a recursive `cause`, so wrapping a provider error never loses
  the original
- `remediation`, aimed at the human operator

Expected failures are returned as `Result<T, ContractError>`; thrown exceptions
are reserved for programmer errors.

**Naming.** Messages are dotted: `<domain>.<entity>.<action>`. Wildcards
(`session.*.completed`, `audit.**`) are legal only in subscriptions.

## Consequences

### Positive

- One audit writer, one redaction implementation, one retry policy, one replay
  format.
- Correlation is structural: every message carries the ids needed to rebuild the
  causal tree without heuristics.
- Redaction metadata travels *with* the payload, so sinks cannot forget it.

### Negative / costs

- Envelope construction on in-process calls costs a small allocation per hop.
  Acceptable: the volume is human-scale, and the alternative is an incomplete
  audit trail.
- A closed error-code enum needs occasional extension; additions are backwards
  compatible, and `vendorCode` absorbs provider specifics in the meantime.

### Neutral

- Envelope `headers` exist for transport metadata but must never carry
  load-bearing business data.

## Alternatives considered

| Option | Why not |
| ------ | ------- |
| CloudEvents | Close in spirit, and we borrowed from it, but its extension model is weaker than a typed union and it has no notion of sensitivity/redaction, actor or delivery semantics — all of which we need. |
| Per-path metadata | Duplicated correlation logic; audit needs an adapter per path; guaranteed drift. |
| Throwing exceptions across boundaries | Loses the machine-readable code, cannot cross a process boundary, and encourages message-string matching. |
| HTTP-style problem details (RFC 7807) | Designed for HTTP; no retryability, causation or vendor-code semantics. |

## Compliance

- `packages/contracts/test/messaging.test.ts` asserts the union parses all four
  kinds, that addresses and names are well-formed, and that wildcards are
  rejected in emitted names but accepted in patterns.
- Any engine surface that returns a bare `Error` or a bespoke error object
  across a boundary violates this ADR.
