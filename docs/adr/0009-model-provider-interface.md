# ADR-0009: One narrow model-provider interface, capability-declared and secret-free

- **Status**: accepted
- **Date**: 2026-07-30
- **Phase**: 0 — Architecture & Contracts Foundation
- **Deciders**: Core maintainers

## Context

The copilot must run against a local model (Ollama, llama.cpp, LM Studio) for
engagements where nothing may leave the machine, and against a hosted API when
the client permits it and the work needs a stronger model. Backends differ in
tool-calling syntax, streaming format, JSON-mode support, token accounting and
error semantics.

Two specific hazards apply to a security tool:

1. **Data egress.** Whether inference happens locally is a *policy input*, not
   trivia. Sending a client's HTTP responses to a third party without permission
   is a breach, not a bug.
2. **Capability guessing.** Code that infers "this model supports tools" from a
   model-name substring breaks the moment a user runs a fine-tune.

## Decision

Every backend implements one interface, `ModelProvider`
(`packages/contracts/src/model/provider.ts`):
`listModels`, `describeModel`, `complete`, optional `stream`, optional `embed`,
optional `countTokens`, `health`, optional `close`.

Design rules:

- **Secrets never appear in a contract object.** `ProviderConfig` carries a
  `credentialRef` (`env:OPENAI_API_KEY`, `keychain:aiptc/openai`) that the host
  resolves at call time. A config object can therefore be logged, persisted and
  exported safely. A negative fixture asserts that a raw `apiKey` field is
  rejected.
- **Hosting is declared** (`local | self-hosted | remote-cloud | unknown`) on
  both provider and model, and `maxSensitivity` bounds what data may reach a
  model. The session's `modelPolicy.requireLocalOnly` and
  `maxEgressSensitivity` are enforced against these fields, so egress control is
  a lookup, not a heuristic.
- **Capabilities are declared, never inferred** (`ModelDescriptor.capabilities`),
  and prompt modules request them from the same vocabulary (ADR-0006).
- **Streaming is a separate method** returning an `AsyncIterable` of
  `CompletionStreamEvent`, so the non-streaming path stays trivially typed and a
  provider that cannot stream simply omits the method.
- **Normalised messages with typed content parts** (`text`, `image`,
  `tool-call`, `tool-result`, `reasoning`), so tool calls and reasoning traces
  are structured data rather than parsed strings. `rawArguments` is retained for
  debugging malformed model output.
- **Provider-native knobs ride in `providerOptions`** and are never interpreted
  by the gateway. That keeps the normalised surface small without blocking
  anyone.
- **Provenance and accounting are part of the response**: `promptDigest`,
  `usage`, `estimatedCost`, `latencyMs`, `firstTokenMs`, `cached`,
  `fallbackFrom`. Budgets (ADR-0005) and audit records depend on these being
  contractual rather than best-effort.
- **`Result`, not exceptions**, so the gateway can implement uniform retry and
  fallback; `ContractError` already models `model_context_length_exceeded`,
  `model_content_filtered`, `rate_limited` and friends.
- **Providers are pluggable** via `ModelProviderFactory`, which a plugin may
  contribute (`contributes.modelProviders`), and declare the contracts version
  they were built against.

## Consequences

### Positive

- Adding a backend is one class; the rest of the system is unaffected.
- Local-only engagements are enforceable from data already in the contract.
- Cost/latency/usage telemetry is uniform across providers.
- Test doubles are trivial, so engines can be tested without a model.

### Negative / costs

- The normalised surface will always lag some provider's newest feature;
  `providerOptions` plus capability flags is the escape hatch.
- Token counting is provider-specific and sometimes only an estimate — hence
  `countTokens` returns `{ tokens, exact }`.

### Neutral

- Embeddings and reranking sit on the same interface as optional methods rather
  than in a separate port.

## Alternatives considered

| Option | Why not |
| ------ | ------- |
| Use a hosted SDK directly in engines | Locks the product to one vendor and makes local-only operation an afterthought. |
| Adopt an existing abstraction (LangChain, Vercel AI SDK) as the contract | Useful implementations, but their types would become our public contract, and they model none of what we actually need: hosting class, sensitivity ceilings, cost accounting, audit provenance. They remain fine choices *inside* a provider implementation. |
| OpenAI-compatible wire format as the internal contract | Convenient today, but bakes one vendor's quirks (and its tool-call encoding) into every engine. |
| Separate interfaces per capability | More types, more registries, no real benefit over declared capabilities plus optional methods. |

## Compliance

- `ProviderConfig`, `ModelDescriptor`, `CompletionRequest`,
  `CompletionResponse`, `CompletionStreamEvent`, `EmbeddingRequest` and
  `EmbeddingResponse` are registered contracts with samples validated by Zod and
  JSON Schema.
- Negative fixture `ProviderConfig / raw-api-key` fails the build if the schema
  ever starts accepting inline secrets.
- The model gateway must refuse a call whose `sensitivity` exceeds the target
  model's `maxSensitivity`, or whose session requires local-only inference
  against a `remote-cloud` provider.
