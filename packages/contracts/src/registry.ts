import { z } from 'zod';

import { ActorSchema, ActorRefSchema } from './domain/actor.js';
import {
  AuthorizationRecordSchema,
  EngagementScopeSchema,
  RulesOfEngagementSchema,
  TargetAssetSchema,
} from './domain/target.js';
import { ArtifactSchema, BlobRefSchema } from './domain/artifact.js';
import { EvidenceSchema, FindingSchema } from './domain/finding.js';
import {
  ApprovalRequestSchema,
  CreateSessionRequestSchema,
  SessionSchema,
  SessionStepSchema,
} from './session/session.js';
import {
  PromptModuleSchema,
  PromptRenderRequestSchema,
  RenderedPromptSchema,
} from './prompt/prompt-module.js';
import {
  EngineMessageSchema,
  EventEnvelopeSchema,
  RequestEnvelopeSchema,
  ResponseEnvelopeSchema,
  StreamChunkEnvelopeSchema,
} from './messaging/envelope.js';
import { DomainEventSchema } from './messaging/events.js';
import { InstalledPluginSchema, PluginManifestSchema } from './plugin/manifest.js';
import {
  CompletionRequestSchema,
  CompletionResponseSchema,
  CompletionStreamEventSchema,
  EmbeddingRequestSchema,
  EmbeddingResponseSchema,
  ModelDescriptorSchema,
  ProviderConfigSchema,
} from './model/provider.js';
import { AuditRecordSchema, MetricSampleSchema, SpanSchema } from './audit/audit.js';

/**
 * Contract registry
 * =================
 * The authoritative list of every published contract schema. Three things read
 * it: the JSON Schema generator, the conformance test suite, and (later) the
 * runtime validator that checks message payloads at engine boundaries.
 *
 * Adding a schema here is what makes it *public*. Anything not listed is an
 * internal building block and may change without a version bump.
 */

/** Version of the contracts package as a whole. Bumped by release tooling. */
export const CONTRACTS_VERSION = '0.1.0';

/** JSON Schema dialect every generated file targets. */
export const JSON_SCHEMA_DIALECT = 'https://json-schema.org/draft/2020-12/schema';

/** Base URI used for `$id` in generated schema files. */
export const SCHEMA_BASE_URI = 'https://schemas.aiptc.dev/contracts';

export interface ContractDescriptor {
  /** Stable schema id, also the generated file name (`<id>.schema.json`). */
  readonly id: string;
  /** Grouping used for docs and directory layout. */
  readonly group:
    | 'session'
    | 'prompt'
    | 'messaging'
    | 'plugin'
    | 'model'
    | 'domain'
    | 'audit';
  readonly title: string;
  readonly description: string;
  readonly schema: z.ZodType;
  /** True for the five foundational Phase 0 contracts. */
  readonly foundational?: boolean;
}

export const CONTRACTS: readonly ContractDescriptor[] = Object.freeze([
  /* ---- Session -------------------------------------------------------- */
  {
    id: 'Session',
    group: 'session',
    title: 'Session',
    description: 'Root aggregate for one engagement run.',
    schema: SessionSchema,
    foundational: true,
  },
  {
    id: 'SessionStep',
    group: 'session',
    title: 'Session step',
    description: 'A planned or executed unit of work inside a session.',
    schema: SessionStepSchema,
  },
  {
    id: 'ApprovalRequest',
    group: 'session',
    title: 'Approval request',
    description: 'Human decision gate blocking session work.',
    schema: ApprovalRequestSchema,
  },
  {
    id: 'CreateSessionRequest',
    group: 'session',
    title: 'Create session request',
    description: 'Payload accepted when creating a session.',
    schema: CreateSessionRequestSchema,
  },

  /* ---- Prompt --------------------------------------------------------- */
  {
    id: 'PromptModule',
    group: 'prompt',
    title: 'Prompt module',
    description: 'Versioned, composable prompt unit with declared I/O and safety metadata.',
    schema: PromptModuleSchema,
    foundational: true,
  },
  {
    id: 'PromptRenderRequest',
    group: 'prompt',
    title: 'Prompt render request',
    description: 'Request to compose and render prompt modules.',
    schema: PromptRenderRequestSchema,
  },
  {
    id: 'RenderedPrompt',
    group: 'prompt',
    title: 'Rendered prompt',
    description: 'Immutable rendered prompt ready for the model gateway.',
    schema: RenderedPromptSchema,
  },

  /* ---- Messaging ------------------------------------------------------ */
  {
    id: 'EngineMessage',
    group: 'messaging',
    title: 'Engine message',
    description: 'Envelope for every engine-to-engine interaction.',
    schema: EngineMessageSchema,
    foundational: true,
  },
  {
    id: 'RequestEnvelope',
    group: 'messaging',
    title: 'Request envelope',
    description: 'Directed call expecting exactly one response.',
    schema: RequestEnvelopeSchema,
  },
  {
    id: 'ResponseEnvelope',
    group: 'messaging',
    title: 'Response envelope',
    description: 'Terminal reply to a request.',
    schema: ResponseEnvelopeSchema,
  },
  {
    id: 'EventEnvelope',
    group: 'messaging',
    title: 'Event envelope',
    description: 'Broadcast fact published on the event bus.',
    schema: EventEnvelopeSchema,
  },
  {
    id: 'StreamChunkEnvelope',
    group: 'messaging',
    title: 'Stream chunk envelope',
    description: 'Ordered chunk of a streaming response.',
    schema: StreamChunkEnvelopeSchema,
  },
  {
    id: 'DomainEvent',
    group: 'messaging',
    title: 'Domain event',
    description: 'Catalogued event name plus payload.',
    schema: DomainEventSchema,
  },

  /* ---- Plugin --------------------------------------------------------- */
  {
    id: 'PluginManifest',
    group: 'plugin',
    title: 'Plugin manifest',
    description: 'Declarative plugin description: contributions, runtime and permissions.',
    schema: PluginManifestSchema,
    foundational: true,
  },
  {
    id: 'InstalledPlugin',
    group: 'plugin',
    title: 'Installed plugin',
    description: 'Host-side record of an installed plugin.',
    schema: InstalledPluginSchema,
  },

  /* ---- Model ---------------------------------------------------------- */
  {
    id: 'ProviderConfig',
    group: 'model',
    title: 'Model provider configuration',
    description: 'Registration data for a model backend. Contains no secrets.',
    schema: ProviderConfigSchema,
    foundational: true,
  },
  {
    id: 'ModelDescriptor',
    group: 'model',
    title: 'Model descriptor',
    description: 'Declared capabilities and limits of one model.',
    schema: ModelDescriptorSchema,
  },
  {
    id: 'CompletionRequest',
    group: 'model',
    title: 'Completion request',
    description: 'Provider-agnostic chat/completion request.',
    schema: CompletionRequestSchema,
  },
  {
    id: 'CompletionResponse',
    group: 'model',
    title: 'Completion response',
    description: 'Normalised provider response.',
    schema: CompletionResponseSchema,
  },
  {
    id: 'CompletionStreamEvent',
    group: 'model',
    title: 'Completion stream event',
    description: 'Incremental streaming event from a provider.',
    schema: CompletionStreamEventSchema,
  },
  {
    id: 'EmbeddingRequest',
    group: 'model',
    title: 'Embedding request',
    description: 'Provider-agnostic embedding request.',
    schema: EmbeddingRequestSchema,
  },
  {
    id: 'EmbeddingResponse',
    group: 'model',
    title: 'Embedding response',
    description: 'Embedding vectors returned by a provider.',
    schema: EmbeddingResponseSchema,
  },

  /* ---- Domain --------------------------------------------------------- */
  {
    id: 'Actor',
    group: 'domain',
    title: 'Actor',
    description: 'Principal that can cause changes.',
    schema: ActorSchema,
  },
  {
    id: 'ActorRef',
    group: 'domain',
    title: 'Actor reference',
    description: 'Compact actor reference for high-volume records.',
    schema: ActorRefSchema,
  },
  {
    id: 'EngagementScope',
    group: 'domain',
    title: 'Engagement scope',
    description: 'What may be tested and how.',
    schema: EngagementScopeSchema,
  },
  {
    id: 'RulesOfEngagement',
    group: 'domain',
    title: 'Rules of engagement',
    description: 'Operational constraints agreed with the client.',
    schema: RulesOfEngagementSchema,
  },
  {
    id: 'TargetAsset',
    group: 'domain',
    title: 'Target asset',
    description: 'A single asset that may be tested.',
    schema: TargetAssetSchema,
  },
  {
    id: 'AuthorizationRecord',
    group: 'domain',
    title: 'Authorization record',
    description: 'Evidence that testing is authorised.',
    schema: AuthorizationRecordSchema,
  },
  {
    id: 'Finding',
    group: 'domain',
    title: 'Finding',
    description: 'A security weakness with evidence and scoring.',
    schema: FindingSchema,
  },
  {
    id: 'Evidence',
    group: 'domain',
    title: 'Evidence',
    description: 'Verifiable observation supporting a finding.',
    schema: EvidenceSchema,
  },
  {
    id: 'Artifact',
    group: 'domain',
    title: 'Artifact',
    description: 'Captured bytes with custody metadata.',
    schema: ArtifactSchema,
  },
  {
    id: 'BlobRef',
    group: 'domain',
    title: 'Blob reference',
    description: 'Pointer to stored bytes.',
    schema: BlobRefSchema,
  },

  /* ---- Audit ---------------------------------------------------------- */
  {
    id: 'AuditRecord',
    group: 'audit',
    title: 'Audit record',
    description: 'Immutable, hash-chained record of a security-relevant action.',
    schema: AuditRecordSchema,
  },
  {
    id: 'MetricSample',
    group: 'audit',
    title: 'Metric sample',
    description: 'A single telemetry measurement.',
    schema: MetricSampleSchema,
  },
  {
    id: 'Span',
    group: 'audit',
    title: 'Trace span',
    description: 'A unit of work in a distributed trace.',
    schema: SpanSchema,
  },
]);

/** Index for O(1) lookup by schema id. */
export const CONTRACTS_BY_ID: ReadonlyMap<string, ContractDescriptor> = new Map(
  CONTRACTS.map((c) => [c.id, c]),
);

/** The five contracts Phase 0 exists to pin down. */
export const FOUNDATIONAL_CONTRACT_IDS: readonly string[] = Object.freeze(
  CONTRACTS.filter((c) => c.foundational).map((c) => c.id),
);

/** Looks up a published schema by id. */
export const getContractSchema = (id: string): z.ZodType | undefined => CONTRACTS_BY_ID.get(id)?.schema;

/**
 * Validates data against a published contract.
 * Returns a discriminated result rather than throwing, matching the error
 * conventions used across engine boundaries.
 */
export const validateContract = <T = unknown>(
  id: string,
  data: unknown,
):
  | { ok: true; value: T }
  | { ok: false; issues: { pointer: string; message: string; code: string }[] } => {
  const schema = getContractSchema(id);
  if (!schema) {
    return { ok: false, issues: [{ pointer: '', message: `Unknown contract schema "${id}"`, code: 'unknown_schema' }] };
  }
  const result = schema.safeParse(data);
  if (result.success) return { ok: true, value: result.data as T };
  return {
    ok: false,
    issues: result.error.issues.map((issue) => ({
      pointer: `/${issue.path.join('/')}`,
      message: issue.message,
      code: issue.code,
    })),
  };
};

/** Builds the canonical `$id` for a schema. */
export const schemaUri = (id: string): string => `${SCHEMA_BASE_URI}/v${CONTRACTS_VERSION}/${id}.schema.json`;

/** Registry consumed by the JSON Schema generator. */
export const buildJsonSchemaRegistry = (): z.core.$ZodRegistry<{ id: string }> => {
  const registry = z.registry<{ id: string }>();
  for (const contract of CONTRACTS) {
    registry.add(contract.schema, { id: contract.id });
  }
  return registry;
};
