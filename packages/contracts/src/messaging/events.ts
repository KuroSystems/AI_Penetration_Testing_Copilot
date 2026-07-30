import { z } from 'zod';
import { ExtensionsSchema, JsonObjectSchema } from '../common/json.js';
import {
  ApprovalIdSchema,
  ArtifactIdSchema,
  FindingIdSchema,
  ModelCallIdSchema,
  PluginIdSchema,
  SessionIdSchema,
  SessionStepIdSchema,
  ToolCallIdSchema,
} from '../common/ids.js';
import {
  DescriptionSchema,
  DurationMsSchema,
  LabelSchema,
  MoneySchema,
  TimestampSchema,
} from '../common/primitives.js';
import { ContractErrorSchema } from '../common/errors.js';
import { SessionPhaseSchema, SessionStateSchema, SessionStepStatusSchema } from '../session/session.js';
import { SeveritySchema } from '../domain/finding.js';
import { ActivityClassSchema } from '../domain/target.js';

/**
 * Event catalog
 * =============
 * Events are *facts*, always past tense, always fire-and-forget. They exist for
 * cross-cutting concerns — audit, telemetry, UI updates, live scope monitoring —
 * and never for request/response work (ADR-0003).
 *
 * Adding an event is additive and safe. Changing an existing payload in a
 * breaking way requires a new name (`*.v2`) or a contracts major bump.
 */

export const EVENT_NAMES = {
  // Session lifecycle
  SESSION_CREATED: 'session.session.created',
  SESSION_STATE_CHANGED: 'session.session.state-changed',
  SESSION_PHASE_CHANGED: 'session.session.phase-changed',
  SESSION_BUDGET_WARNING: 'session.budget.warning',
  SESSION_BUDGET_EXCEEDED: 'session.budget.exceeded',
  SESSION_ENDED: 'session.session.ended',

  // Step lifecycle
  STEP_PLANNED: 'session.step.planned',
  STEP_STARTED: 'session.step.started',
  STEP_COMPLETED: 'session.step.completed',
  STEP_FAILED: 'session.step.failed',

  // Human-in-the-loop
  APPROVAL_REQUESTED: 'approval.request.created',
  APPROVAL_DECIDED: 'approval.request.decided',
  APPROVAL_EXPIRED: 'approval.request.expired',

  // Findings & artifacts
  FINDING_CREATED: 'finding.finding.created',
  FINDING_UPDATED: 'finding.finding.updated',
  FINDING_STATUS_CHANGED: 'finding.finding.status-changed',
  ARTIFACT_STORED: 'evidence.artifact.stored',

  // Model gateway
  MODEL_CALL_STARTED: 'model.call.started',
  MODEL_CALL_COMPLETED: 'model.call.completed',
  MODEL_CALL_FAILED: 'model.call.failed',

  // Tooling & plugins
  TOOL_CALL_STARTED: 'tool.call.started',
  TOOL_CALL_COMPLETED: 'tool.call.completed',
  PLUGIN_LOADED: 'plugin.plugin.loaded',
  PLUGIN_UNLOADED: 'plugin.plugin.unloaded',
  PLUGIN_FAILED: 'plugin.plugin.failed',

  // Policy & safety
  POLICY_EVALUATED: 'policy.decision.evaluated',
  POLICY_DENIED: 'policy.decision.denied',
  SCOPE_VIOLATION_BLOCKED: 'policy.scope.violation-blocked',

  // Cross-cutting sinks
  AUDIT_RECORD_APPENDED: 'audit.record.appended',
  TELEMETRY_METRIC_RECORDED: 'telemetry.metric.recorded',
  TELEMETRY_SPAN_ENDED: 'telemetry.span.ended',

  // Storage
  ENTITY_PERSISTED: 'storage.entity.persisted',
  ENTITY_DELETED: 'storage.entity.deleted',
} as const;

export type EventName = (typeof EVENT_NAMES)[keyof typeof EVENT_NAMES];

export const EventNameSchema = z.enum(
  Object.values(EVENT_NAMES) as [EventName, ...EventName[]],
);

/* -------------------------------------------------------------------------- */
/* Payloads                                                                    */
/* -------------------------------------------------------------------------- */

export const SessionCreatedPayloadSchema = z.strictObject({
  sessionId: SessionIdSchema,
  title: LabelSchema,
  autonomy: z.string().max(32),
  createdAt: TimestampSchema,
});

export const SessionStateChangedPayloadSchema = z
  .strictObject({
    sessionId: SessionIdSchema,
    from: SessionStateSchema,
    to: SessionStateSchema,
    reason: DescriptionSchema.optional(),
    changedAt: TimestampSchema,
  })
  .meta({ id: 'SessionStateChangedPayload', title: 'session.session.state-changed payload' });
export type SessionStateChangedPayload = z.infer<typeof SessionStateChangedPayloadSchema>;

export const SessionPhaseChangedPayloadSchema = z.strictObject({
  sessionId: SessionIdSchema,
  from: SessionPhaseSchema.optional(),
  to: SessionPhaseSchema,
  changedAt: TimestampSchema,
});

export const BudgetEventPayloadSchema = z.strictObject({
  sessionId: SessionIdSchema,
  /** Which budget dimension tripped. */
  dimension: z.enum(['wall-clock', 'model-calls', 'input-tokens', 'output-tokens', 'tool-invocations', 'cost']),
  limit: z.number().min(0),
  observed: z.number().min(0),
  /** Fraction of the limit consumed. */
  ratio: z.number().min(0),
  cost: MoneySchema.optional(),
});

export const StepEventPayloadSchema = z
  .strictObject({
    sessionId: SessionIdSchema,
    stepId: SessionStepIdSchema,
    sequence: z.int().min(0).optional(),
    title: LabelSchema.optional(),
    status: SessionStepStatusSchema,
    activityClass: ActivityClassSchema.optional(),
    durationMs: DurationMsSchema.optional(),
    error: ContractErrorSchema.optional(),
  })
  .meta({ id: 'StepEventPayload', title: 'session.step.* payload' });
export type StepEventPayload = z.infer<typeof StepEventPayloadSchema>;

export const ApprovalEventPayloadSchema = z.strictObject({
  sessionId: SessionIdSchema,
  approvalId: ApprovalIdSchema,
  status: z.enum(['pending', 'approved', 'rejected', 'expired', 'cancelled']),
  summary: LabelSchema.max(500).optional(),
  activityClass: ActivityClassSchema.optional(),
  decidedAt: TimestampSchema.optional(),
});

export const FindingEventPayloadSchema = z.strictObject({
  sessionId: SessionIdSchema.optional(),
  findingId: FindingIdSchema,
  title: LabelSchema.optional(),
  severity: SeveritySchema.optional(),
  status: z.string().max(32).optional(),
  previousStatus: z.string().max(32).optional(),
});

export const ArtifactStoredPayloadSchema = z.strictObject({
  sessionId: SessionIdSchema.optional(),
  artifactId: ArtifactIdSchema,
  kind: z.string().max(64),
  sizeBytes: z.int().min(0).optional(),
});

export const ModelCallEventPayloadSchema = z
  .strictObject({
    sessionId: SessionIdSchema.optional(),
    callId: ModelCallIdSchema,
    /** `provider/model`, e.g. `ollama/llama3.1:8b`. */
    modelRef: z.string().max(200),
    promptDigest: z.string().max(200).optional(),
    inputTokens: z.int().min(0).optional(),
    outputTokens: z.int().min(0).optional(),
    durationMs: DurationMsSchema.optional(),
    cost: MoneySchema.optional(),
    finishReason: z.string().max(64).optional(),
    error: ContractErrorSchema.optional(),
  })
  .meta({ id: 'ModelCallEventPayload', title: 'model.call.* payload' });
export type ModelCallEventPayload = z.infer<typeof ModelCallEventPayloadSchema>;

export const ToolCallEventPayloadSchema = z.strictObject({
  sessionId: SessionIdSchema.optional(),
  toolCallId: ToolCallIdSchema,
  toolName: z.string().max(128),
  pluginId: PluginIdSchema.optional(),
  activityClass: ActivityClassSchema.optional(),
  durationMs: DurationMsSchema.optional(),
  exitCode: z.int().optional(),
  error: ContractErrorSchema.optional(),
});

export const PluginLifecyclePayloadSchema = z.strictObject({
  pluginId: PluginIdSchema,
  name: z.string().max(128),
  version: z.string().max(64),
  reason: DescriptionSchema.optional(),
  error: ContractErrorSchema.optional(),
});

export const PolicyDecisionPayloadSchema = z
  .strictObject({
    sessionId: SessionIdSchema.optional(),
    /** What was being attempted, e.g. `tool.invoke` or `model.completion`. */
    action: z.string().max(128),
    /** Target of the action (host, URL, plugin id, …). */
    resource: z.string().max(2_048).optional(),
    decision: z.enum(['allow', 'deny', 'require-approval']),
    /** Ids of the rules that fired, for explainability. */
    matchedRules: z.array(z.string().max(128)).max(32).optional(),
    reason: DescriptionSchema.optional(),
    activityClass: ActivityClassSchema.optional(),
  })
  .meta({ id: 'PolicyDecisionPayload', title: 'policy.decision.* payload' });
export type PolicyDecisionPayload = z.infer<typeof PolicyDecisionPayloadSchema>;

export const StoragePayloadSchema = z.strictObject({
  /** Repository/collection name, e.g. `session` or `finding`. */
  collection: z.string().max(64),
  entityId: z.string().max(128),
  revision: z.int().min(0).optional(),
});

/**
 * Registry describing every catalogued event: which payload schema applies and
 * whether the audit engine must persist it. Later phases read this table to
 * wire subscriptions and to validate payloads at publish time.
 */
export interface EventDescriptor {
  name: EventName;
  description: string;
  payload: z.ZodType;
  /** Persisted to the immutable audit log. */
  audited: boolean;
  /** Emitted at high volume; telemetry sinks may sample it. */
  highVolume?: boolean;
}

export const EVENT_CATALOG: readonly EventDescriptor[] = Object.freeze([
  { name: EVENT_NAMES.SESSION_CREATED, description: 'A session was created.', payload: SessionCreatedPayloadSchema, audited: true },
  { name: EVENT_NAMES.SESSION_STATE_CHANGED, description: 'A session moved between lifecycle states.', payload: SessionStateChangedPayloadSchema, audited: true },
  { name: EVENT_NAMES.SESSION_PHASE_CHANGED, description: 'A session moved to another methodology phase.', payload: SessionPhaseChangedPayloadSchema, audited: true },
  { name: EVENT_NAMES.SESSION_BUDGET_WARNING, description: 'A session crossed its soft budget threshold.', payload: BudgetEventPayloadSchema, audited: true },
  { name: EVENT_NAMES.SESSION_BUDGET_EXCEEDED, description: 'A session exhausted a budget dimension.', payload: BudgetEventPayloadSchema, audited: true },
  { name: EVENT_NAMES.SESSION_ENDED, description: 'A session reached a terminal state.', payload: SessionStateChangedPayloadSchema, audited: true },

  { name: EVENT_NAMES.STEP_PLANNED, description: 'A step was added to the plan.', payload: StepEventPayloadSchema, audited: true },
  { name: EVENT_NAMES.STEP_STARTED, description: 'A step began executing.', payload: StepEventPayloadSchema, audited: true },
  { name: EVENT_NAMES.STEP_COMPLETED, description: 'A step finished successfully.', payload: StepEventPayloadSchema, audited: true },
  { name: EVENT_NAMES.STEP_FAILED, description: 'A step failed.', payload: StepEventPayloadSchema, audited: true },

  { name: EVENT_NAMES.APPROVAL_REQUESTED, description: 'A human approval gate was opened.', payload: ApprovalEventPayloadSchema, audited: true },
  { name: EVENT_NAMES.APPROVAL_DECIDED, description: 'A human approved or rejected a gate.', payload: ApprovalEventPayloadSchema, audited: true },
  { name: EVENT_NAMES.APPROVAL_EXPIRED, description: 'An approval gate expired without a decision.', payload: ApprovalEventPayloadSchema, audited: true },

  { name: EVENT_NAMES.FINDING_CREATED, description: 'A finding was recorded.', payload: FindingEventPayloadSchema, audited: true },
  { name: EVENT_NAMES.FINDING_UPDATED, description: 'A finding was edited.', payload: FindingEventPayloadSchema, audited: true },
  { name: EVENT_NAMES.FINDING_STATUS_CHANGED, description: 'A finding changed status.', payload: FindingEventPayloadSchema, audited: true },
  { name: EVENT_NAMES.ARTIFACT_STORED, description: 'Bytes were written to the blob store.', payload: ArtifactStoredPayloadSchema, audited: true },

  { name: EVENT_NAMES.MODEL_CALL_STARTED, description: 'A model call was dispatched.', payload: ModelCallEventPayloadSchema, audited: true, highVolume: true },
  { name: EVENT_NAMES.MODEL_CALL_COMPLETED, description: 'A model call returned.', payload: ModelCallEventPayloadSchema, audited: true, highVolume: true },
  { name: EVENT_NAMES.MODEL_CALL_FAILED, description: 'A model call failed.', payload: ModelCallEventPayloadSchema, audited: true },

  { name: EVENT_NAMES.TOOL_CALL_STARTED, description: 'A tool invocation started.', payload: ToolCallEventPayloadSchema, audited: true },
  { name: EVENT_NAMES.TOOL_CALL_COMPLETED, description: 'A tool invocation finished.', payload: ToolCallEventPayloadSchema, audited: true },
  { name: EVENT_NAMES.PLUGIN_LOADED, description: 'A plugin was loaded into the host.', payload: PluginLifecyclePayloadSchema, audited: true },
  { name: EVENT_NAMES.PLUGIN_UNLOADED, description: 'A plugin was unloaded.', payload: PluginLifecyclePayloadSchema, audited: true },
  { name: EVENT_NAMES.PLUGIN_FAILED, description: 'A plugin crashed or failed to load.', payload: PluginLifecyclePayloadSchema, audited: true },

  { name: EVENT_NAMES.POLICY_EVALUATED, description: 'The policy engine reached a decision.', payload: PolicyDecisionPayloadSchema, audited: true, highVolume: true },
  { name: EVENT_NAMES.POLICY_DENIED, description: 'An action was denied by policy.', payload: PolicyDecisionPayloadSchema, audited: true },
  { name: EVENT_NAMES.SCOPE_VIOLATION_BLOCKED, description: 'An out-of-scope action was blocked.', payload: PolicyDecisionPayloadSchema, audited: true },

  { name: EVENT_NAMES.AUDIT_RECORD_APPENDED, description: 'An audit record was appended to the log.', payload: JsonObjectSchema, audited: false, highVolume: true },
  { name: EVENT_NAMES.TELEMETRY_METRIC_RECORDED, description: 'A metric sample was recorded.', payload: JsonObjectSchema, audited: false, highVolume: true },
  { name: EVENT_NAMES.TELEMETRY_SPAN_ENDED, description: 'A trace span ended.', payload: JsonObjectSchema, audited: false, highVolume: true },

  { name: EVENT_NAMES.ENTITY_PERSISTED, description: 'An entity was written by a repository.', payload: StoragePayloadSchema, audited: false, highVolume: true },
  { name: EVENT_NAMES.ENTITY_DELETED, description: 'An entity was deleted by a repository.', payload: StoragePayloadSchema, audited: true },
]);

/** Generic shape of a catalogued domain event, payload validated separately. */
export const DomainEventSchema = z
  .strictObject({
    name: EventNameSchema,
    occurredAt: TimestampSchema,
    subject: z.string().max(128).optional(),
    payload: JsonObjectSchema,
    extensions: ExtensionsSchema.optional(),
  })
  .meta({ id: 'DomainEvent', title: 'Domain event' });
export type DomainEvent = z.infer<typeof DomainEventSchema>;
