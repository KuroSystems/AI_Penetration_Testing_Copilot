import { z } from 'zod';
import { ExtensionsSchema, JsonObjectSchema } from '../common/json.js';
import {
  AuditIdSchema,
  CorrelationIdSchema,
  MessageIdSchema,
  SessionIdSchema,
} from '../common/ids.js';
import {
  DescriptionSchema,
  DurationMsSchema,
  LabelSchema,
  SchemaVersionSchema,
  SemVerSchema,
  Sha256Schema,
  SensitivitySchema,
  TimestampSchema,
} from '../common/primitives.js';
import { ActorRefSchema } from '../domain/actor.js';
import { ContractErrorSchema } from '../common/errors.js';
import { ActivityClassSchema } from '../domain/target.js';

/**
 * Audit log
 * =========
 * Append-only, tamper-evident record of everything that mattered. It is written
 * by an *event subscriber*, never by the engine doing the work — which is the
 * main reason the event bus exists at all (ADR-0003).
 *
 * Tamper evidence: each record stores `previousHash` and `hash`, where
 * `hash = sha256(canonicalJson(record without hash) + previousHash)`. A broken
 * chain is detectable without a signing key; signing is layered on later.
 */

export const AuditOutcomeSchema = z.enum(['success', 'failure', 'denied', 'partial', 'pending']);

export const AuditRecordSchema = z
  .strictObject({
    schemaVersion: SchemaVersionSchema,
    id: AuditIdSchema,
    /** Monotonic sequence within the log; gaps mean loss. */
    sequence: z.int().min(0),
    recordedAt: TimestampSchema,
    /** When the audited thing actually happened (may precede `recordedAt`). */
    occurredAt: TimestampSchema.optional(),
    /** Event name or operation name that triggered the record. */
    action: z.string().min(1).max(128),
    /** Coarse grouping for filtering: which engine/domain acted. */
    category: z.enum([
      'session',
      'authorization',
      'policy',
      'model',
      'tool',
      'plugin',
      'finding',
      'evidence',
      'storage',
      'configuration',
      'security',
      'system',
    ]),
    outcome: AuditOutcomeSchema,
    actor: ActorRefSchema,
    /** Entity acted upon, e.g. `session:ses_01J…` or `host:10.0.0.5`. */
    target: z.string().max(2_048).optional(),
    sessionId: SessionIdSchema.optional(),
    correlationId: CorrelationIdSchema.optional(),
    causationId: MessageIdSchema.optional(),
    activityClass: ActivityClassSchema.optional(),
    summary: LabelSchema.max(500),
    detail: DescriptionSchema.optional(),
    /** Redacted payload snapshot; never raw credentials. */
    data: JsonObjectSchema.optional(),
    /** True when `data` had redactions applied before persisting. */
    redacted: z.boolean().optional(),
    sensitivity: SensitivitySchema.optional(),
    error: ContractErrorSchema.optional(),
    durationMs: DurationMsSchema.optional(),
    /** Software version that produced the record, for forensic replay. */
    producerVersion: SemVerSchema.optional(),
    /** Hash chain. */
    previousHash: Sha256Schema.optional(),
    hash: Sha256Schema.optional(),
    extensions: ExtensionsSchema.optional(),
  })
  .meta({
    id: 'AuditRecord',
    title: 'Audit record',
    description: 'Immutable, hash-chained record of a security-relevant action.',
  });
export type AuditRecord = z.infer<typeof AuditRecordSchema>;

/* -------------------------------------------------------------------------- */
/* Telemetry                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Telemetry is *lossy and local by default*: metrics and spans exist to make
 * the copilot debuggable, never to phone home. Exporters are opt-in and are
 * configured outside the contracts package.
 */
export const MetricKindSchema = z.enum(['counter', 'gauge', 'histogram', 'summary']);

export const MetricSampleSchema = z
  .strictObject({
    name: z
      .string()
      .min(1)
      .max(128)
      .regex(/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)*$/),
    kind: MetricKindSchema,
    value: z.number(),
    unit: z.enum(['count', 'milliseconds', 'bytes', 'tokens', 'ratio', 'currency-minor']).optional(),
    /** Low-cardinality dimensions only; never ids or free text. */
    attributes: z.record(z.string().max(64), z.union([z.string().max(128), z.number(), z.boolean()])).optional(),
    recordedAt: TimestampSchema,
    sessionId: SessionIdSchema.optional(),
  })
  .meta({ id: 'MetricSample', title: 'Metric sample' });
export type MetricSample = z.infer<typeof MetricSampleSchema>;

export const SpanSchema = z
  .strictObject({
    traceId: z.string().regex(/^[0-9a-f]{32}$/),
    spanId: z.string().regex(/^[0-9a-f]{16}$/),
    parentSpanId: z.string().regex(/^[0-9a-f]{16}$/).optional(),
    name: LabelSchema.max(128),
    kind: z.enum(['internal', 'client', 'server', 'producer', 'consumer']).optional(),
    startedAt: TimestampSchema,
    endedAt: TimestampSchema,
    durationMs: DurationMsSchema.optional(),
    status: z.enum(['unset', 'ok', 'error']),
    attributes: JsonObjectSchema.optional(),
    events: z
      .array(z.strictObject({ name: LabelSchema.max(128), at: TimestampSchema, attributes: JsonObjectSchema.optional() }))
      .max(64)
      .optional(),
    sessionId: SessionIdSchema.optional(),
    correlationId: CorrelationIdSchema.optional(),
  })
  .meta({ id: 'Span', title: 'Trace span' });
export type Span = z.infer<typeof SpanSchema>;

/* -------------------------------------------------------------------------- */
/* Sink interfaces                                                             */
/* -------------------------------------------------------------------------- */

/** Implemented by the audit engine; consumed by nobody else directly. */
export interface AuditSink {
  /** Appends a record and returns it with `sequence`/`hash` filled in. */
  append(record: Omit<AuditRecord, 'sequence' | 'hash' | 'previousHash'>): Promise<AuditRecord>;
  /** Flushes any buffered records; called on shutdown. */
  flush(): Promise<void>;
}

export interface TelemetrySink {
  metric(sample: MetricSample): void;
  span(span: Span): void;
  flush(): Promise<void>;
}
