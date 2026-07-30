# ADR-0005: The Session is the root aggregate, with an explicit state machine and a frozen scope

- **Status**: accepted
- **Date**: 2026-07-30
- **Phase**: 0 — Architecture & Contracts Foundation
- **Deciders**: Core maintainers

## Context

Everything the copilot does happens *inside something*: a model call, a tool
invocation, a finding, an artifact, an approval. That something needs to answer,
at any instant and after the fact:

- Are we allowed to do this? (scope, rules of engagement, authorisation)
- How much autonomy does the operator want right now?
- How much budget is left?
- What has happened so far, and who decided it?

If those answers are scattered across engines, safety becomes emergent — which
is another way of saying accidental.

## Decision

`Session` (`packages/contracts/src/session/session.ts`) is the root aggregate.

- **Explicit lifecycle**: `draft → authorized → running → …` with the legal
  transitions published as data (`SESSION_STATE_TRANSITIONS`) rather than
  reimplemented per engine. The UI, the orchestrator and the audit verifier all
  read the same table. `archived` is the only absorbing state; every terminal
  state routes to it.
- **Autonomy is a first-class field**, not a config flag:
  `advisory | assisted | supervised | autonomous | dry-run`. `dry-run` is part of
  the lifecycle vocabulary so "plan it but do not touch anything" is a supported
  mode from day one rather than a bolt-on.
- **Scope is frozen into the session.** `Session.scope` embeds a full copy of the
  `EngagementScope` at start, instead of referencing a mutable record. A session
  must never widen its own permission surface because somebody edited the
  engagement later; and a replay six months from now must see the scope that was
  actually in force.
- **Budgets and usage are mirrored** (`SessionBudget` / `SessionUsage`), so
  "stop before you burn the client's money/time" is enforceable centrally and
  visible in one place.
- **Steps are separate entities** referenced by id (`SessionStep`), because a
  long engagement produces thousands and no consumer wants them inlined. The
  step carries executor, activity class, approval linkage, timings, produced
  findings/artifacts and retry lineage — enough for a full reconstruction.
- **Human gates are modelled** (`ApprovalRequest`) instead of implied by a
  paused state, so "who approved exploitation of this host, when, and on what
  information" is answerable.
- **`revision`** supports the optimistic concurrency rule from ADR-0004.

## Consequences

### Positive

- One object answers the safety questions; policy checks have a single input.
- Replay and reporting are possible from persisted state alone.
- The state machine being data makes illegal transitions testable, and makes the
  UI's enabled/disabled buttons derivable rather than hand-maintained.

### Negative / costs

- Embedding the scope duplicates data across sessions. Accepted: correctness and
  auditability beat normalisation, and scopes are small.
- The session object is large. Consumers that only need a summary will want a
  projection later; that is a read-model concern, not a contract change.

### Neutral

- Objectives, participants and context are optional; the minimal legal session
  is a `draft` with a scope and an owner.

## Alternatives considered

| Option | Why not |
| ------ | ------- |
| Session as a thin id with state spread across engines | Safety questions would need a distributed join at exactly the moment we need a fast, certain answer. |
| Scope by reference | A mutable scope silently changes what past runs were allowed to do; makes audit unfalsifiable. |
| Steps inlined in the session | Unbounded document growth, write amplification on every step update. |
| Implicit approvals (just pause the session) | Loses who/when/why, which is the entire point of a human gate. |

## Compliance

- `packages/contracts/test/session-lifecycle.test.ts` pins the transition table's
  invariants (total, no self-transitions, single absorbing state, reachability,
  no resurrection of completed/aborted sessions).
- Engines must consult `SESSION_STATE_TRANSITIONS` instead of hard-coding
  transitions; a hard-coded transition in review is a defect.
