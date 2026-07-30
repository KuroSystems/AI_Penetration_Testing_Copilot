import { z } from 'zod';
import { ExtensionsSchema, JsonObjectSchema, JsonValueSchema } from '../common/json.js';
import type { JsonObject, JsonValue } from '../common/json.js';
import { ModelCallIdSchema, SessionIdSchema, ToolCallIdSchema } from '../common/ids.js';
import {
  ContentDigestSchema,
  DescriptionSchema,
  DurationMsSchema,
  LabelSchema,
  MediaTypeSchema,
  MoneySchema,
  SchemaVersionSchema,
  SemVerSchema,
  SensitivitySchema,
  SlugSchema,
  TimestampSchema,
  UriSchema,
} from '../common/primitives.js';
import { ContractErrorSchema } from '../common/errors.js';
import type { Result } from '../common/errors.js';

/**
 * Model provider contract
 * =======================
 * One narrow interface every backend implements: local runtimes (Ollama,
 * llama.cpp, LM Studio), hosted APIs, and test doubles. Design constraints
 * (ADR-0009):
 *
 *  - **Secrets never appear in a contract object.** Configuration carries a
 *    *reference* (`credentialRef`) resolved by the host at call time.
 *  - **Capabilities are declared, not guessed.** Callers check
 *    `ModelDescriptor.capabilities` instead of string-matching model names.
 *  - **Streaming is a separate method**, not an overloaded return type, so the
 *    non-streaming path stays trivially typed.
 *  - **Provider-native extras** ride in `providerOptions` and are never
 *    interpreted by the gateway.
 */

/* -------------------------------------------------------------------------- */
/* Descriptors                                                                 */
/* -------------------------------------------------------------------------- */

export const ModelCapabilitySchema = z.enum([
  'chat',
  'completion',
  'tools',
  'parallel-tool-calls',
  'json-mode',
  'json-schema',
  'streaming',
  'vision',
  'audio-input',
  'embeddings',
  'reranking',
  'reasoning',
  'logprobs',
  'seed',
  'system-prompt',
  'prefix-caching',
  'stop-sequences',
  'token-counting',
]);
export type ModelCapability = z.infer<typeof ModelCapabilitySchema>;

/** Where inference physically happens — drives the data-egress policy. */
export const ModelHostingSchema = z.enum(['local', 'self-hosted', 'remote-cloud', 'unknown']);

export const ModelPricingSchema = z.strictObject({
  currency: z.string().regex(/^[A-Z]{3}$/),
  /** Cost per 1M input tokens in minor units. */
  inputPerMillion: z.number().min(0).optional(),
  outputPerMillion: z.number().min(0).optional(),
  cachedInputPerMillion: z.number().min(0).optional(),
  perRequest: z.number().min(0).optional(),
});

export const ModelDescriptorSchema = z
  .strictObject({
    /** Stable `provider/model` reference, e.g. `ollama/llama3.1:8b`. */
    ref: z.string().min(1).max(200),
    providerName: SlugSchema,
    /** Provider-native model name, passed through verbatim. */
    modelName: z.string().min(1).max(200),
    displayName: LabelSchema.optional(),
    family: z.string().max(64).optional(),
    version: z.string().max(64).optional(),
    hosting: ModelHostingSchema,
    capabilities: z.array(ModelCapabilitySchema).max(32),
    contextWindowTokens: z.int().min(1).optional(),
    maxOutputTokens: z.int().min(1).optional(),
    /** Embedding dimensionality when the model supports embeddings. */
    embeddingDimensions: z.int().min(1).optional(),
    inputModalities: z.array(z.enum(['text', 'image', 'audio'])).max(8).optional(),
    pricing: ModelPricingSchema.optional(),
    /** Highest data class allowed to reach this model. */
    maxSensitivity: SensitivitySchema.optional(),
    /** Provider-declared knowledge cutoff, if published. */
    knowledgeCutoff: z.string().max(32).optional(),
    deprecated: z.boolean().optional(),
    extensions: ExtensionsSchema.optional(),
  })
  .meta({
    id: 'ModelDescriptor',
    title: 'Model descriptor',
    description: 'Declared capabilities and limits of one model exposed by a provider.',
  });
export type ModelDescriptor = z.infer<typeof ModelDescriptorSchema>;

/** Provider registration/config. Never contains a secret value. */
export const ProviderConfigSchema = z
  .strictObject({
    schemaVersion: SchemaVersionSchema,
    name: SlugSchema,
    displayName: LabelSchema.optional(),
    kind: z.enum(['ollama', 'llama-cpp', 'lm-studio', 'openai-compatible', 'anthropic', 'custom', 'mock']),
    baseUrl: UriSchema.optional(),
    /**
     * Opaque handle the host resolves to a credential
     * (`env:OPENAI_API_KEY`, `keychain:aiptc/openai`, …). Never a raw key.
     */
    credentialRef: z.string().max(256).optional(),
    hosting: ModelHostingSchema,
    /** Default model ref used when a caller does not pin one. */
    defaultModel: z.string().max(200).optional(),
    timeoutMs: DurationMsSchema.optional(),
    maxRetries: z.int().min(0).max(10).optional(),
    /** Client-side rate limiting the gateway enforces. */
    rateLimit: z
      .strictObject({
        requestsPerMinute: z.int().min(1).optional(),
        tokensPerMinute: z.int().min(1).optional(),
        maxConcurrent: z.int().min(1).optional(),
      })
      .optional(),
    headers: z.record(z.string().max(64), z.string().max(1_024)).optional(),
    /** Static model list for providers without a discovery endpoint. */
    models: z.array(ModelDescriptorSchema).max(256).optional(),
    enabled: z.boolean().optional(),
    extensions: ExtensionsSchema.optional(),
  })
  .meta({ id: 'ProviderConfig', title: 'Model provider configuration' });
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;

/* -------------------------------------------------------------------------- */
/* Messages                                                                    */
/* -------------------------------------------------------------------------- */

export const TextPartSchema = z.strictObject({
  type: z.literal('text'),
  text: z.string(),
  /** Marks a prefix that providers with prompt caching may reuse. */
  cacheable: z.boolean().optional(),
});

export const ImagePartSchema = z.strictObject({
  type: z.literal('image'),
  /** Data URI or blob URI; the gateway resolves blob URIs before dispatch. */
  uri: z.string().max(2_048).optional(),
  base64: z.string().optional(),
  mediaType: MediaTypeSchema.optional(),
  detail: z.enum(['low', 'high', 'auto']).optional(),
});

export const ToolCallPartSchema = z.strictObject({
  type: z.literal('tool-call'),
  toolCallId: ToolCallIdSchema.or(z.string().min(1).max(128)),
  toolName: z.string().min(1).max(128),
  /** Parsed arguments; the gateway validates them against the tool schema. */
  arguments: JsonObjectSchema,
  /** Raw, unparsed argument string as emitted by the model, for debugging. */
  rawArguments: z.string().max(200_000).optional(),
});

export const ToolResultPartSchema = z.strictObject({
  type: z.literal('tool-result'),
  toolCallId: ToolCallIdSchema.or(z.string().min(1).max(128)),
  toolName: z.string().min(1).max(128).optional(),
  result: JsonValueSchema,
  isError: z.boolean().optional(),
});

/** Provider-visible reasoning/thinking content, kept separate from answers. */
export const ReasoningPartSchema = z.strictObject({
  type: z.literal('reasoning'),
  text: z.string(),
  /** Opaque provider token needed to continue a reasoning thread. */
  signature: z.string().max(4_096).optional(),
  redacted: z.boolean().optional(),
});

export const ContentPartSchema = z.discriminatedUnion('type', [
  TextPartSchema,
  ImagePartSchema,
  ToolCallPartSchema,
  ToolResultPartSchema,
  ReasoningPartSchema,
]);
export type ContentPart = z.infer<typeof ContentPartSchema>;

export const ModelMessageSchema = z
  .strictObject({
    role: z.enum(['system', 'developer', 'user', 'assistant', 'tool']),
    /** String shorthand is accepted and normalised to a single text part. */
    content: z.union([z.string(), z.array(ContentPartSchema)]),
    /** Speaker label for multi-agent transcripts. */
    name: z.string().max(64).optional(),
    sensitivity: SensitivitySchema.optional(),
  })
  .meta({ id: 'ModelMessage', title: 'Model message' });
export type ModelMessage = z.infer<typeof ModelMessageSchema>;

/* -------------------------------------------------------------------------- */
/* Requests                                                                    */
/* -------------------------------------------------------------------------- */

/** Tool exposed to the model for this call. */
export const ModelToolSchema = z.strictObject({
  name: z.string().min(1).max(128),
  description: DescriptionSchema,
  /** JSON Schema (2020-12) for the arguments object. */
  inputSchema: JsonObjectSchema,
  /** Hint that the tool is side-effect free. */
  readOnly: z.boolean().optional(),
});
export type ModelTool = z.infer<typeof ModelToolSchema>;

export const ToolChoiceSchema = z.union([
  z.enum(['auto', 'none', 'required']),
  z.strictObject({ type: z.literal('tool'), name: z.string().min(1).max(128) }),
]);

export const ResponseFormatSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('text') }),
  z.strictObject({ type: z.literal('json') }),
  z.strictObject({
    type: z.literal('json-schema'),
    name: SlugSchema.optional(),
    /** JSON Schema (2020-12) the output must satisfy. */
    schema: JsonObjectSchema,
    strict: z.boolean().optional(),
  }),
]);

export const CompletionRequestSchema = z
  .strictObject({
    /** Assigned by the caller so logs, audit and telemetry all agree. */
    callId: ModelCallIdSchema.optional(),
    sessionId: SessionIdSchema.optional(),
    /** `provider/model`; omit to use the provider default. */
    model: z.string().max(200).optional(),
    messages: z.array(ModelMessageSchema).min(1).max(2_048),
    tools: z.array(ModelToolSchema).max(256).optional(),
    toolChoice: ToolChoiceSchema.optional(),
    responseFormat: ResponseFormatSchema.optional(),
    temperature: z.number().min(0).max(2).optional(),
    topP: z.number().min(0).max(1).optional(),
    topK: z.int().min(1).optional(),
    maxOutputTokens: z.int().min(1).optional(),
    stopSequences: z.array(z.string().max(64)).max(8).optional(),
    presencePenalty: z.number().min(-2).max(2).optional(),
    frequencyPenalty: z.number().min(-2).max(2).optional(),
    /** Deterministic sampling where supported. */
    seed: z.int().optional(),
    /** Per-call deadline; the provider must abort when exceeded. */
    timeoutMs: DurationMsSchema.optional(),
    /** Safe-to-retry marker for the gateway's retry policy. */
    idempotencyKey: z.string().max(200).optional(),
    /** Highest data class present in `messages`; gates provider selection. */
    sensitivity: SensitivitySchema.optional(),
    /** Passed through untouched to the provider SDK. */
    providerOptions: JsonObjectSchema.optional(),
    /** Free-form labels attached to telemetry for this call. */
    metadata: JsonObjectSchema.optional(),
    extensions: ExtensionsSchema.optional(),
  })
  .meta({
    id: 'CompletionRequest',
    title: 'Completion request',
    description: 'Provider-agnostic chat/completion request.',
  });
export type CompletionRequest = z.infer<typeof CompletionRequestSchema>;

/* -------------------------------------------------------------------------- */
/* Responses                                                                   */
/* -------------------------------------------------------------------------- */

export const FinishReasonSchema = z.enum([
  'stop',
  'length',
  'tool-calls',
  'content-filter',
  'cancelled',
  'error',
  'other',
]);
export type FinishReason = z.infer<typeof FinishReasonSchema>;

export const TokenUsageSchema = z.strictObject({
  inputTokens: z.int().min(0).optional(),
  outputTokens: z.int().min(0).optional(),
  totalTokens: z.int().min(0).optional(),
  reasoningTokens: z.int().min(0).optional(),
  cachedInputTokens: z.int().min(0).optional(),
});
export type TokenUsage = z.infer<typeof TokenUsageSchema>;

export const CompletionResponseSchema = z
  .strictObject({
    callId: ModelCallIdSchema,
    /** Resolved `provider/model` actually used (may differ after fallback). */
    model: z.string().max(200),
    /** Provider's own response id, kept for support tickets. */
    providerResponseId: z.string().max(200).optional(),
    message: ModelMessageSchema,
    /** Convenience: concatenated text parts of `message`. */
    text: z.string().optional(),
    toolCalls: z.array(ToolCallPartSchema).max(64).optional(),
    finishReason: FinishReasonSchema,
    usage: TokenUsageSchema.optional(),
    estimatedCost: MoneySchema.optional(),
    createdAt: TimestampSchema,
    latencyMs: DurationMsSchema.optional(),
    /** Time to first token, for streaming calls. */
    firstTokenMs: DurationMsSchema.optional(),
    /** Digest of the exact prompt sent; lets audit prove the input. */
    promptDigest: ContentDigestSchema.optional(),
    /** True when the gateway served this from its cache. */
    cached: z.boolean().optional(),
    /** Populated when a fallback model was used after a failure. */
    fallbackFrom: z.string().max(200).optional(),
    warnings: z.array(LabelSchema.max(500)).max(16).optional(),
    raw: JsonValueSchema.optional(),
    extensions: ExtensionsSchema.optional(),
  })
  .meta({
    id: 'CompletionResponse',
    title: 'Completion response',
    description: 'Normalised provider response with usage, cost and provenance.',
  });
export type CompletionResponse = z.infer<typeof CompletionResponseSchema>;

/** Incremental streaming event. */
export const CompletionStreamEventSchema = z
  .discriminatedUnion('type', [
    z.strictObject({ type: z.literal('start'), callId: ModelCallIdSchema, model: z.string().max(200) }),
    z.strictObject({ type: z.literal('text-delta'), delta: z.string() }),
    z.strictObject({ type: z.literal('reasoning-delta'), delta: z.string() }),
    z.strictObject({
      type: z.literal('tool-call-delta'),
      toolCallId: z.string().max(128),
      toolName: z.string().max(128).optional(),
      argumentsDelta: z.string(),
    }),
    z.strictObject({ type: z.literal('tool-call'), toolCall: ToolCallPartSchema }),
    z.strictObject({ type: z.literal('usage'), usage: TokenUsageSchema }),
    z.strictObject({ type: z.literal('error'), error: ContractErrorSchema }),
    z.strictObject({ type: z.literal('finish'), finishReason: FinishReasonSchema, response: CompletionResponseSchema.optional() }),
  ])
  .meta({ id: 'CompletionStreamEvent', title: 'Completion stream event' });
export type CompletionStreamEvent = z.infer<typeof CompletionStreamEventSchema>;

/* -------------------------------------------------------------------------- */
/* Embeddings & tokenisation                                                   */
/* -------------------------------------------------------------------------- */

export const EmbeddingRequestSchema = z
  .strictObject({
    model: z.string().max(200).optional(),
    input: z.array(z.string().max(100_000)).min(1).max(512),
    /** Reduce dimensionality where the provider supports it. */
    dimensions: z.int().min(1).optional(),
    sensitivity: SensitivitySchema.optional(),
    providerOptions: JsonObjectSchema.optional(),
  })
  .meta({ id: 'EmbeddingRequest', title: 'Embedding request' });
export type EmbeddingRequest = z.infer<typeof EmbeddingRequestSchema>;

export const EmbeddingResponseSchema = z
  .strictObject({
    model: z.string().max(200),
    embeddings: z.array(z.array(z.number())).min(1),
    usage: TokenUsageSchema.optional(),
    createdAt: TimestampSchema,
  })
  .meta({ id: 'EmbeddingResponse', title: 'Embedding response' });
export type EmbeddingResponse = z.infer<typeof EmbeddingResponseSchema>;

/* -------------------------------------------------------------------------- */
/* Interface                                                                   */
/* -------------------------------------------------------------------------- */

export interface ProviderHealth {
  readonly status: 'healthy' | 'degraded' | 'unavailable';
  readonly detail?: string;
  readonly checkedAt: string;
  readonly latencyMs?: number;
}

export interface CompletionCallOptions {
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
  /** Correlation id propagated into provider logs/telemetry. */
  readonly correlationId?: string;
}

/**
 * Every model backend implements exactly this. Methods return `Result` rather
 * than throwing so the gateway can apply uniform retry/fallback logic.
 */
export interface ModelProvider {
  /** Stable provider name, matching `ProviderConfig.name`. */
  readonly name: string;
  readonly hosting: 'local' | 'self-hosted' | 'remote-cloud' | 'unknown';
  /** Contracts version this provider implementation was built against. */
  readonly contractsVersion: string;

  /** Discovers available models. May consult the network. */
  listModels(options?: { signal?: AbortSignal }): Promise<Result<ModelDescriptor[]>>;

  /** Resolves one model, or `not_found`. */
  describeModel(model: string): Promise<Result<ModelDescriptor>>;

  /** Single-shot completion. */
  complete(
    request: CompletionRequest,
    options?: CompletionCallOptions,
  ): Promise<Result<CompletionResponse>>;

  /** Streaming completion. Implementations MUST end with `finish` or `error`. */
  stream?(
    request: CompletionRequest,
    options?: CompletionCallOptions,
  ): AsyncIterable<CompletionStreamEvent>;

  /** Embeddings, when `embeddings` is in the model's capabilities. */
  embed?(
    request: EmbeddingRequest,
    options?: CompletionCallOptions,
  ): Promise<Result<EmbeddingResponse>>;

  /** Exact or estimated token count for a prompt. */
  countTokens?(
    request: Pick<CompletionRequest, 'model' | 'messages' | 'tools'>,
  ): Promise<Result<{ tokens: number; exact: boolean }>>;

  /** Cheap reachability probe; must not consume quota where avoidable. */
  health(options?: { signal?: AbortSignal }): Promise<ProviderHealth>;

  /** Releases sockets/child processes. */
  close?(): Promise<void>;
}

/** Factory a plugin or the host registers for a provider kind. */
export interface ModelProviderFactory {
  readonly kind: string;
  /** JSON Schema for the provider-specific part of `ProviderConfig`. */
  readonly configSchema?: JsonObject;
  create(config: ProviderConfig, deps: { resolveCredential(ref: string): Promise<string | undefined> }): Promise<Result<ModelProvider>>;
}

/** Selection input the gateway uses to route a call to a provider/model. */
export interface ModelSelectionCriteria {
  readonly requiredCapabilities?: ModelCapability[];
  readonly minContextTokens?: number;
  readonly localOnly?: boolean;
  readonly maxSensitivity?: string;
  readonly preferred?: string[];
  readonly excluded?: string[];
}

/** Re-exported for implementations that want the raw JSON types. */
export type { JsonObject, JsonValue };

/** Contracts version of this interface, checked at provider registration. */
export const MODEL_PROVIDER_INTERFACE_VERSION = '0.1.0' as const;
export const ModelProviderInterfaceVersionSchema = SemVerSchema;
