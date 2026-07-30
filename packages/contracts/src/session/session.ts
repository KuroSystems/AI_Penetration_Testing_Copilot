import { z } from 'zod';
import { ExtensionsSchema, JsonObjectSchema } from '../common/json.js';
import {
  ActorIdSchema,
  ApprovalIdSchema,
  ArtifactIdSchema,
  AuthorizationIdSchema,
  EngagementIdSchema,
  FindingIdSchema,
  PluginIdSchema,
  PromptModuleIdSchema,
  SessionIdSchema,
  SessionStepIdSchema,
  TaskIdSchema,
} from '../common/ids.js';
import {
  DescriptionSchema,
  DurationMsSchema,
  LabelSchema,
  MoneySchema,
  SchemaVersionSchema,
  SemVerSchema,
  SensitivitySchema,
  TagsSchema,
  TimestampSchema,
  TimezoneSchema,
  UnitIntervalSchema,
} from '../common/primitives.js';
import { ActorRoleSchema } from '../domain/actor.js';
import { ActivityClassSchema, EngagementScopeSchema } from '../domain/target.js';
import { ContractErrorSchema } from '../common/errors.js';

/* -------------------------------------------------------------------------- */
/* Lifecycle                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Session lifecycle states.
 *
 * `draft` is the only state in which a session may exist without a valid
 * authorization record; every other state requires one (ADR-0012).
 */
export const SessionStateSchema = z.enum([
  'draft', // being configured, nothing may execute
  'authorized', // authorisation attached and validated, not started
  'running', // engines are actively working
  'awaiting-approval', // blocked on a human decision
  'paused', // suspended by an operator or a window/budget guard
  'completed', // finished normally
  'aborted', // stopped early by an operator
  'failed', // stopped by an unrecoverable error
  'archived', // read-only, retained for reporting/audit
]);
export type SessionState = z.infer<typeof SessionStateSchema>;

/**
 * The single source of truth for legal state transitions. Engines MUST consult
 * this table rather than re-deriving rules; it lives in contracts so that the
 * orchestration engine, the UI and the audit verifier agree by construction.
 */
export const SESSION_STATE_TRANSITIONS: Readonly<Record<SessionState, readonly SessionState[]>> = Object.freeze({
  draft: ['authorized', 'aborted'],
  authorized: ['running', 'draft', 'aborted'],
  running: ['awaiting-approval', 'paused', 'completed', 'aborted', 'failed'],
  'awaiting-approval': ['running', 'paused', 'aborted', 'failed'],
  paused: ['running', 'aborted', 'failed', 'completed'],
  completed: ['archived'],
  aborted: ['archived'],
  failed: ['archived', 'running'],
  archived: [],
});

/** Terminal states: no further work may be scheduled. */
export const TERMINAL_SESSION_STATES: readonly SessionState[] = Object.freeze([
  'completed',
  'aborted',
  'failed',
  'archived',
]);

/** Methodology phase the session is currently working through. */
export const SessionPhaseSchema = z.enum([
  'scoping',
  'reconnaissance',
  'enumeration',
  'vulnerability-analysis',
  'exploitation',
  'post-exploitation',
  'lateral-movement',
  'reporting',
  'remediation-verification',
  'closed',
]);
export type SessionPhase = z.infer<typeof SessionPhaseSchema>;

/**
 * How much rope the copilot gets.
 * - `advisory`: never executes anything, only suggests.
 * - `assisted`: executes read-only/passive actions, asks before anything active.
 * - `supervised`: executes within scope, asks before ROE-flagged classes.
 * - `autonomous`: executes within scope and ROE without per-action approval.
 * - `dry-run`: plans and renders commands but substitutes a no-op executor.
 */
export const AutonomyLevelSchema = z.enum(['advisory', 'assisted', 'supervised', 'autonomous', 'dry-run']);
export type AutonomyLevel = z.infer<typeof AutonomyLevelSchema>;

/* -------------------------------------------------------------------------- */
/* Budgets, policy and participants                                            */
/* -------------------------------------------------------------------------- */

/**
 * Hard resource ceilings. The orchestration engine must refuse work that would
 * exceed any set limit, and emit `session.budget.exceeded` when one is hit.
 */
export const SessionBudgetSchema = z.strictObject({
  maxWallClockMs: DurationMsSchema.optional(),
  maxModelCalls: z.int().min(0).optional(),
  maxInputTokens: z.int().min(0).optional(),
  maxOutputTokens: z.int().min(0).optional(),
  maxToolInvocations: z.int().min(0).optional(),
  maxCost: MoneySchema.optional(),
  /** Stop scheduling new work at this fraction of any budget (e.g. 0.9). */
  softStopThreshold: UnitIntervalSchema.optional(),
});
export type SessionBudget = z.infer<typeof SessionBudgetSchema>;

/** Live consumption counters mirroring `SessionBudget`. */
export const SessionUsageSchema = z.strictObject({
  elapsedMs: z.int().min(0).optional(),
  modelCalls: z.int().min(0).optional(),
  inputTokens: z.int().min(0).optional(),
  outputTokens: z.int().min(0).optional(),
  toolInvocations: z.int().min(0).optional(),
  estimatedCost: MoneySchema.optional(),
  findingsCount: z.int().min(0).optional(),
  errorsCount: z.int().min(0).optional(),
});
export type SessionUsage = z.infer<typeof SessionUsageSchema>;

/**
 * Model selection policy for the session. Concrete provider resolution happens
 * in the model gateway; the session only expresses intent and constraints.
 */
export const SessionModelPolicySchema = z.strictObject({
  /** Preferred model refs in priority order, e.g. `ollama/llama3.1:70b`. */
  preferred: z.array(z.string().max(200)).max(16).optional(),
  fallback: z.array(z.string().max(200)).max(16).optional(),
  /** Refuse any provider that is not local-only. */
  requireLocalOnly: z.boolean().optional(),
  /** Highest data class allowed to leave the machine. */
  maxEgressSensitivity: SensitivitySchema.optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxOutputTokens: z.int().min(1).optional(),
  /** Deterministic replay: pin a seed when the provider supports it. */
  seed: z.int().optional(),
});
export type SessionModelPolicy = z.infer<typeof SessionModelPolicySchema>;

export const SessionParticipantSchema = z.strictObject({
  actorId: ActorIdSchema,
  role: ActorRoleSchema,
  joinedAt: TimestampSchema.optional(),
  leftAt: TimestampSchema.optional(),
});
export type SessionParticipant = z.infer<typeof SessionParticipantSchema>;

/** A pending or resolved human decision gate. */
export const ApprovalRequestSchema = z
  .strictObject({
    id: ApprovalIdSchema,
    sessionId: SessionIdSchema,
    requestedAt: TimestampSchema,
    requestedBy: ActorIdSchema,
    /** What is being asked for, in operator language. */
    summary: LabelSchema.max(500),
    detail: DescriptionSchema.optional(),
    activityClass: ActivityClassSchema.optional(),
    /** Step/task this gate blocks. */
    blocks: z.array(SessionStepIdSchema).max(64).optional(),
    riskLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    expiresAt: TimestampSchema.optional(),
    status: z.enum(['pending', 'approved', 'rejected', 'expired', 'cancelled']),
    decidedAt: TimestampSchema.optional(),
    decidedBy: ActorIdSchema.optional(),
    decisionNote: DescriptionSchema.optional(),
    extensions: ExtensionsSchema.optional(),
  })
  .meta({
    id: 'ApprovalRequest',
    title: 'Approval request',
    description: 'A human decision gate blocking one or more session steps.',
  });
export type ApprovalRequest = z.infer<typeof ApprovalRequestSchema>;

/* -------------------------------------------------------------------------- */
/* Steps                                                                       */
/* -------------------------------------------------------------------------- */

export const SessionStepStatusSchema = z.enum([
  'planned',
  'queued',
  'awaiting-approval',
  'running',
  'succeeded',
  'failed',
  'skipped',
  'cancelled',
]);

/**
 * One unit of work inside a session. Steps are the join point between the
 * planner (which proposes them), orchestration (which schedules them), tooling
 * or the model gateway (which executes them) and audit (which records them).
 */
export const SessionStepSchema = z
  .strictObject({
    id: SessionStepIdSchema,
    sessionId: SessionIdSchema,
    /** Monotonic ordinal within the session; gaps are allowed. */
    sequence: z.int().min(0),
    parentStepId: SessionStepIdSchema.optional(),
    taskId: TaskIdSchema.optional(),
    title: LabelSchema,
    intent: DescriptionSchema.optional(),
    phase: SessionPhaseSchema.optional(),
    activityClass: ActivityClassSchema.optional(),
    status: SessionStepStatusSchema,
    /** Executor kind, so replay knows what produced the result. */
    executor: z.enum(['model', 'tool', 'plugin', 'human', 'internal']).optional(),
    executorRef: z.string().max(200).optional(),
    promptModuleId: PromptModuleIdSchema.optional(),
    pluginId: PluginIdSchema.optional(),
    input: JsonObjectSchema.optional(),
    output: JsonObjectSchema.optional(),
    error: ContractErrorSchema.optional(),
    approvalId: ApprovalIdSchema.optional(),
    startedAt: TimestampSchema.optional(),
    endedAt: TimestampSchema.optional(),
    durationMs: DurationMsSchema.optional(),
    producedFindingIds: z.array(FindingIdSchema).max(256).optional(),
    producedArtifactIds: z.array(ArtifactIdSchema).max(256).optional(),
    /** Steps that must complete before this one may start. */
    dependsOn: z.array(SessionStepIdSchema).max(64).optional(),
    retryOf: SessionStepIdSchema.optional(),
    attempt: z.int().min(1).optional(),
    tags: TagsSchema.optional(),
    extensions: ExtensionsSchema.optional(),
  })
  .meta({
    id: 'SessionStep',
    title: 'Session step',
    description: 'A single planned or executed unit of work within a session.',
  });
export type SessionStep = z.infer<typeof SessionStepSchema>;

/* -------------------------------------------------------------------------- */
/* Session                                                                     */
/* -------------------------------------------------------------------------- */

/** Pointer to the working context the session accumulates. */
export const SessionContextRefSchema = z.strictObject({
  /** Conversation/thread the UI renders. */
  conversationId: z.string().max(128).optional(),
  /** Knowledge-base collections this session may read. */
  knowledgeCollections: z.array(z.string().max(128)).max(32).optional(),
  /** Prompt modules pinned for the whole session. */
  pinnedPromptModuleIds: z.array(PromptModuleIdSchema).max(64).optional(),
  /** Plugins enabled for this session. */
  enabledPluginIds: z.array(PluginIdSchema).max(128).optional(),
  /** Rolling summary maintained by the context engine. */
  summary: DescriptionSchema.optional(),
  /** Arbitrary scratch state owned by engines; keyed by engine name. */
  scratchpad: JsonObjectSchema.optional(),
});
export type SessionContextRef = z.infer<typeof SessionContextRefSchema>;

export const SessionSchema = z
  .strictObject({
    /** Contract version of this document. */
    schemaVersion: SchemaVersionSchema,
    id: SessionIdSchema,
    engagementId: EngagementIdSchema,
    /** Required for any state other than `draft`. */
    authorizationId: AuthorizationIdSchema.optional(),
    title: LabelSchema,
    description: DescriptionSchema.optional(),
    state: SessionStateSchema,
    phase: SessionPhaseSchema.optional(),
    autonomy: AutonomyLevelSchema,
    /** Frozen copy of the scope at session start; the session never re-reads it. */
    scope: EngagementScopeSchema,
    objectives: z
      .array(
        z.strictObject({
          id: z.string().max(64),
          statement: LabelSchema.max(500),
          priority: z.enum(['must', 'should', 'could']).optional(),
          satisfied: z.boolean().optional(),
        }),
      )
      .max(64)
      .optional(),
    participants: z.array(SessionParticipantSchema).max(64).optional(),
    ownerActorId: ActorIdSchema,
    modelPolicy: SessionModelPolicySchema.optional(),
    budget: SessionBudgetSchema.optional(),
    usage: SessionUsageSchema.optional(),
    context: SessionContextRefSchema.optional(),
    /** Ids only — steps are stored separately and can be large. */
    stepIds: z.array(SessionStepIdSchema).max(10_000).optional(),
    pendingApprovalIds: z.array(ApprovalIdSchema).max(64).optional(),
    findingIds: z.array(FindingIdSchema).max(10_000).optional(),
    createdAt: TimestampSchema,
    updatedAt: TimestampSchema,
    startedAt: TimestampSchema.optional(),
    endedAt: TimestampSchema.optional(),
    lastError: ContractErrorSchema.optional(),
    /** Optimistic-concurrency token; bumped on every persisted mutation. */
    revision: z.int().min(0),
    /** Version of the copilot that created the session (for replay fidelity). */
    createdByVersion: SemVerSchema.optional(),
    timezone: TimezoneSchema.optional(),
    sensitivity: SensitivitySchema.optional(),
    tags: TagsSchema.optional(),
    metadata: JsonObjectSchema.optional(),
    extensions: ExtensionsSchema.optional(),
  })
  .meta({
    id: 'Session',
    title: 'Session',
    description:
      'The root aggregate of an engagement run: scope, authorisation, autonomy, budget, progress and outcomes.',
  });
export type Session = z.infer<typeof SessionSchema>;

/** Payload accepted when creating a session (server assigns ids/timestamps). */
export const CreateSessionRequestSchema = z
  .strictObject({
    engagementId: EngagementIdSchema,
    authorizationId: AuthorizationIdSchema.optional(),
    title: LabelSchema,
    description: DescriptionSchema.optional(),
    autonomy: AutonomyLevelSchema,
    scope: EngagementScopeSchema,
    ownerActorId: ActorIdSchema,
    modelPolicy: SessionModelPolicySchema.optional(),
    budget: SessionBudgetSchema.optional(),
    tags: TagsSchema.optional(),
    metadata: JsonObjectSchema.optional(),
    extensions: ExtensionsSchema.optional(),
  })
  .meta({ id: 'CreateSessionRequest', title: 'Create session request' });
export type CreateSessionRequest = z.infer<typeof CreateSessionRequestSchema>;
