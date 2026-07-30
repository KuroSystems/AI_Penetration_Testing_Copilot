# ADR-0002: A single `@aiptc/contracts` package, with Zod as the source of truth

- **Status**: accepted
- **Date**: 2026-07-30
- **Phase**: 0 — Architecture & Contracts Foundation
- **Deciders**: Core maintainers

## Context

Phase 0 exists to fix the interfaces every later engine must honour: Session,
Prompt Module, engine-to-engine envelope, Plugin manifest, Model provider. Those
shapes are needed in three different worlds:

1. **TypeScript compile time** — engines want static types, not `any`.
2. **Runtime** — messages crossing an engine or plugin boundary must be
   validated; a plugin is untrusted input, and so is a model's tool call.
3. **Outside TypeScript** — plugin authors, CI linters, editors and possibly
   non-JS runtimes need a language-neutral description.

Maintaining three artefacts by hand guarantees drift. Whichever one is
hand-written, the other two must be generated from it.

## Decision

- All published contracts live in one workspace package, **`@aiptc/contracts`**,
  which every later package depends on. Nothing else may define a cross-engine
  shape.
- **Zod (v4) schemas are the single source of truth.** Static types are derived
  with `z.infer`; JSON Schema 2020-12 files are generated with `z.toJSONSchema`
  into `packages/contracts/schemas/` and are **committed** so non-TypeScript
  consumers need no build step.
- A registry (`src/registry.ts`) enumerates every *published* contract. Being in
  the registry is what makes a schema public and subject to the versioning
  policy (ADR-0010); anything else is an internal building block.
- Sample payloads are written as typed TypeScript values (`src/examples.ts`) and
  emitted to `packages/contracts/samples/*.json`. They are type-checked against
  the contracts, validated against the Zod schemas *and* against the generated
  JSON Schemas, so all three representations are proven to agree on every commit.
- The package contains **no engine logic**: no I/O, no timers, no randomness, no
  classes, and no dependency other than Zod.

## Consequences

### Positive

- One definition, three consistent artefacts; drift is a build failure, not a
  production surprise.
- Runtime validation is available everywhere for free, which matters because the
  system feeds untrusted target data and model output into its own control flow.
- Generated JSON Schema gives plugin authors editor completion and CI validation
  without depending on our TypeScript build.

### Negative / costs

- Zod-specific idioms leak into the contract definitions (`z.strictObject`,
  `.meta({ id })`), and exotic Zod features that do not translate to JSON Schema
  (transforms, `.default()`, custom refinements) are effectively forbidden.
- Generated schemas must be regenerated and committed; a `--check` mode in CI
  enforces it.

### Neutral

- The JSON Schema dialect is pinned to 2020-12.

## Alternatives considered

| Option | Why not |
| ------ | ------- |
| Hand-written JSON Schema → generate TS | Language-neutral, but every engine then needs Ajv wiring for what Zod gives natively, and generated TS types are less ergonomic (no branded refinements, awkward unions). |
| TypeScript interfaces only | No runtime validation at all — unacceptable when plugin and model output is untrusted. |
| Protocol Buffers / Cap'n Proto | Strong contracts, but adds a compiler and a binary encoding to a local-first Node application whose payloads are naturally JSON, and makes hand-editing plugin manifests unpleasant. |
| Maintain TS + JSON Schema in parallel with a parity test | The parity test is the only thing standing between the two; generation makes parity structural instead. |

## Compliance

- `packages/contracts/test/conformance.test.ts` validates every sample against
  both Zod and the generated JSON Schema, and asserts the committed samples
  match the typed examples.
- `packages/contracts/test/no-engine-logic.test.ts` fails if the package gains a
  class, an I/O import, a timer, randomness or a non-Zod dependency.
- `npm run schemas:check` fails when the committed schemas or samples are stale.
