# ADR-0006: Prompts are versioned, composable modules with a declared I/O contract

- **Status**: accepted
- **Date**: 2026-07-30
- **Phase**: 0 — Architecture & Contracts Foundation
- **Deciders**: Core maintainers

## Context

Prompts are this system's most-edited source code, and the easiest thing to get
dangerously wrong. Three failure modes drive this decision:

1. **Untraceable behaviour.** If prompts are string literals in engine code,
   nobody can answer "which exact instructions produced this finding?" — which
   a penetration test report must be able to answer.
2. **Prompt injection.** Much of what we interpolate is attacker-controlled:
   HTTP responses, page content, tool output from a target system. Treating that
   as ordinary template data is how a target takes over the copilot.
3. **Copy-paste sprawl.** Safety guardrails duplicated across twenty prompts
   will be updated in nineteen.

## Decision

A `PromptModule` (`packages/contracts/src/prompt/prompt-module.ts`) is a
first-class, versioned, storable entity — never a string in code.

- **Identity and versioning**: stable `key` (`analysis.reflected-input-triage`)
  plus semver `version`; consumers select with a range. `contentDigest` proves
  what was rendered.
- **Kinds fix composition order**: at most one `persona`, any number of
  `guardrail`s, one `task`, plus `fragment`s, `tool-instruction`s,
  `output-format`s. Guardrails are always injected and default to
  `templateEngine: 'none'` so their text cannot be influenced by data.
- **Declared variables**, each with a type, JSON Schema refinement, sensitivity
  and — critically — a **trust level and sanitizer**. Anything derived from a
  target is `trust: 'untrusted'` and is fenced/escaped before interpolation.
  Prompt injection defence is thus a property of the contract, not of whoever
  wrote the template that day.
- **Declared output contract**: `outputSchema` + `outputFormat`, so structured
  output is validated rather than regex-scraped.
- **Declared model requirements**: context size, capabilities (shared vocabulary
  with `ModelDescriptor.capabilities`), sampling defaults. The gateway can then
  refuse a model that cannot honour the module instead of failing weirdly.
- **Declared safety metadata**: activity classes the module can cause,
  `requiresApproval`, `requiresScope`, `maxSensitivity`, `localModelsOnly`.
  These are checked against the session's rules of engagement *before* rendering.
- **Examples and evaluations** ship with the module, so prompts are regression
  tested like code.
- **Rendering produces `RenderedPrompt`**: the exact messages, the modules that
  composed it (`key@version`), a digest, an estimated token count. This is what
  the audit log stores and what makes a finding reproducible.

## Consequences

### Positive

- "Which prompt produced this?" is answerable from persisted data.
- Guardrails are authored once and composed everywhere.
- Untrusted interpolation is explicit and reviewable.
- Prompt changes can be A/B tested and rolled back by version.

### Negative / costs

- Heavier than writing a template string; authors must declare variables and
  metadata. This is deliberate friction on the most safety-sensitive surface.
- The prompt engine (a later phase) must implement composition, sanitisation and
  token budgeting — real work that a naive design would skip.

### Neutral

- Multiple template dialects are allowed (`mustache`, `handlebars`, `liquid`,
  `fstring`, `none`); the engine picks which it supports.

## Alternatives considered

| Option | Why not |
| ------ | ------- |
| Prompts as string constants in code | Untraceable, unversioned, unreviewable, duplicated guardrails. |
| Prompts as plain Markdown files | Better, but no declared variables, trust levels, output schema or model requirements — the metadata is exactly what makes them safe. |
| A third-party prompt-management SaaS | Local-first product; sending engagement context to a hosted prompt service is a non-starter. |
| Free-form templates with runtime escaping heuristics | Heuristic escaping fails silently; declaring trust per variable does not. |

## Compliance

- `PromptModule` is registered in the contract registry and has samples that are
  validated by both Zod and JSON Schema.
- The prompt engine must reject a render whose module declares
  `requiresScope: true` when no scope is resolvable, and must refuse activity
  classes not permitted by the session's rules of engagement (ADR-0012).
