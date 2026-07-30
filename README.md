# AI Penetration Testing Copilot

A local-first copilot for **authorised** penetration testing: it plans, executes
and documents security testing work under an operator's control, with scope,
rules of engagement and an audit trail built into its foundations rather than
bolted on.

> **Status: Phase 0 — Architecture & Contracts Foundation.**
> No engine is implemented yet. What exists is the set of contracts every later
> engine must honour, the architecture decisions behind them, and a conformance
> suite that proves the contracts hold together.

> **Legal notice.** This project is for testing systems you own or are
> explicitly authorised in writing to test. The contracts enforce that posture:
> a session cannot leave `draft` without an authorisation record, scope is
> default-deny, and every activity class is checked against machine-readable
> rules of engagement.

## What is here today

```
packages/contracts/   @aiptc/contracts — schemas, types, interfaces (Phase 0)
docs/adr/             Architecture Decision Records
docs/architecture.md  System overview and engine boundaries
docs/contracts.md     Practical guide to using and changing the contracts
```

### The five foundational contracts

| Contract | Purpose |
| --- | --- |
| `Session` | Root aggregate: scope, authorisation, autonomy, budget, progress |
| `PromptModule` | Versioned, composable prompt unit with declared I/O and safety metadata |
| `EngineMessage` | One envelope for every engine-to-engine hop (request / response / event / stream) |
| `PluginManifest` | What a plugin contributes, how it runs, and exactly which capabilities it may use |
| `ProviderConfig` / `ModelProvider` | Model backend interface — capability-declared, secret-free, local-first |

Plus the supporting domain (`EngagementScope`, `AuthorizationRecord`, `Finding`,
`Evidence`, `Artifact`, `AuditRecord`, …) and the runtime ports (`EventBus`,
`EngineClient`, `StorageProvider`, `PluginHost`).

### Key architecture decisions

- **Direct calls for request/response, an in-process event bus for cross-cutting
  concerns** (audit, telemetry, live UI). One envelope covers both paths, so the
  audit trail is complete by construction — [ADR-0003](docs/adr/0003-event-bus-vs-direct-calls.md).
- **Storage behind the repository pattern**, so SQLite + local files can be
  swapped without touching an engine — [ADR-0004](docs/adr/0004-storage-abstraction-repository-pattern.md).
- **Zod is the single source of truth**; JSON Schema 2020-12 is generated and
  committed for non-TypeScript consumers — [ADR-0002](docs/adr/0002-contracts-package-with-zod-as-source-of-truth.md).
- **Safety primitives live in the contracts**, default-deny —
  [ADR-0012](docs/adr/0012-authorization-scope-and-safety-in-the-contracts.md).

Full index: [`docs/adr/README.md`](docs/adr/README.md).

## Getting started

```bash
npm install          # Node >= 20.10
npm run typecheck
npm test             # contract conformance suite
npm run verify       # typecheck + stale-artifact check + tests
```

Regenerate the published artefacts after changing a schema:

```bash
npm run schemas -w @aiptc/contracts
```

## Roadmap

| Phase | Scope | Status |
| --- | --- | --- |
| 0 | Architecture & contracts foundation | ✅ complete |
| 1+ | Engines (orchestration, prompt, model gateway, tooling, plugins, policy, audit, storage, reporting) | planned |

Every later phase consumes `@aiptc/contracts` and must not redefine a shape that
crosses a boundary.

## License

MIT
