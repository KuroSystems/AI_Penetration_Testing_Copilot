# ADR-0001: Record architecture decisions

- **Status**: accepted
- **Date**: 2026-07-30
- **Phase**: 0 — Architecture & Contracts Foundation
- **Deciders**: Core maintainers

## Context

The AI Penetration Testing Copilot is being built phase by phase, and every
later phase (orchestration, prompt engine, model gateway, tooling, plugins,
reporting) depends on decisions made in Phase 0. Those decisions are cheap to
make now and expensive to reverse later. Six months from now nobody will
remember *why* engine communication is split between direct calls and events, or
why storage hides behind repositories — and without the "why", the next
contributor will "fix" it.

A second force is specific to this product: it is a security tool. Reviewers,
auditors and users will legitimately ask why the system is allowed to do what it
does. Decisions about scope enforcement, authorisation records and data egress
need a written, dated, reviewable rationale.

## Decision

We keep lightweight Architecture Decision Records (Michael Nygard style) in
`docs/adr/`, numbered sequentially and never rewritten once accepted.

- One decision per file, named `NNNN-kebab-case-title.md`.
- A decision is changed by adding a new ADR that supersedes the old one; the old
  file stays, with its status updated to `superseded by ADR-XXXX`.
- Any change to a published contract, an engine boundary, a storage guarantee or
  a safety control requires an ADR in the same pull request.
- ADRs describe *decisions and consequences*, not API documentation. Reference
  documentation lives in `docs/` and in the doc comments of
  `packages/contracts/src`.

## Consequences

### Positive

- Later phases can be onboarded by reading `docs/adr/` in order.
- Contract churn becomes visible: a flurry of superseding ADRs is a signal that
  Phase 0 under-specified something.
- Security reviewers get a paper trail for the safety-relevant choices.

### Negative / costs

- Small ongoing writing overhead per structural change.
- Risk of ADRs drifting from the code; mitigated by the "Compliance" section,
  which points at the test or file that enforces each decision.

### Neutral

- No tooling is mandated; ADRs are plain Markdown.

## Alternatives considered

| Option | Why not |
| ------ | ------- |
| Design docs in a wiki | Drifts from the code, not reviewable in PRs, invisible in `git blame`. |
| Comments only | Cannot express rejected alternatives or dated context. |
| RFC process | Too heavy for a project at this stage. |

## Compliance

`docs/adr/README.md` indexes every ADR. Pull requests that change
`packages/contracts/src/**` without touching `docs/adr/**` should be questioned
in review.
