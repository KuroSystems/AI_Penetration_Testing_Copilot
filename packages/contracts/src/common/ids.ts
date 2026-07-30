import { z } from 'zod';

/**
 * Identifier strategy
 * ===================
 * Every entity id is `<prefix>_<ulid|uuid>`:
 *
 *   ses_01J9Z8Q2X4T5V6W7Y8Z9A0B1C2      (ULID, lexicographically sortable)
 *   ses_6f1c1f04-1f1f-4c7a-9b0e-...     (UUID v4/v7, for imported data)
 *
 * Rationale (ADR-0011):
 *  - The prefix makes ids self-describing in logs, envelopes and audit records,
 *    and makes "wrong id in the wrong field" a *validation* error instead of a
 *    debugging session.
 *  - ULID is the default because it is monotonic-ish, sortable by creation time
 *    and case-insensitive-safe (Crockford base32), which keeps SQLite indexes
 *    tight; UUID is accepted so external tools/imports are not blocked.
 *  - Ids are opaque to consumers: never parse anything but the prefix.
 */

const ULID = '[0-9A-HJKMNP-TV-Z]{26}';
const UUID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';

/** Canonical prefix for every entity type in the system. */
export const ID_PREFIXES = {
  session: 'ses',
  sessionStep: 'stp',
  engagement: 'eng',
  authorization: 'auth',
  target: 'tgt',
  finding: 'fnd',
  evidence: 'evd',
  artifact: 'art',
  promptModule: 'pmd',
  promptRender: 'prn',
  message: 'msg',
  correlation: 'cor',
  conversation: 'cnv',
  event: 'evt',
  subscription: 'sub',
  plugin: 'plg',
  pluginInstance: 'pin',
  tool: 'tol',
  toolCall: 'tcl',
  engine: 'egn',
  model: 'mdl',
  modelCall: 'mcl',
  provider: 'prv',
  actor: 'act',
  approval: 'apr',
  audit: 'aud',
  telemetry: 'tel',
  task: 'tsk',
  run: 'run',
  report: 'rpt',
  transaction: 'txn',
} as const;

export type IdKind = keyof typeof ID_PREFIXES;
export type IdPrefix = (typeof ID_PREFIXES)[IdKind];

/** Builds a strict schema for a prefixed identifier. */
export const prefixedId = (prefix: IdPrefix, what: string) =>
  z
    .string()
    .regex(new RegExp(`^${prefix}_(?:${ULID}|${UUID})$`))
    .describe(`${what} identifier (\`${prefix}_<ulid|uuid>\`)`);

/** Matches any well-formed prefixed identifier, whatever the entity type. */
export const AnyIdSchema = z
  .string()
  .regex(new RegExp(`^[a-z]{3,6}_(?:${ULID}|${UUID})$`))
  .describe('Any prefixed entity identifier');
export type AnyId = z.infer<typeof AnyIdSchema>;

export const SessionIdSchema = prefixedId(ID_PREFIXES.session, 'Session');
export const SessionStepIdSchema = prefixedId(ID_PREFIXES.sessionStep, 'Session step');
export const EngagementIdSchema = prefixedId(ID_PREFIXES.engagement, 'Engagement');
export const AuthorizationIdSchema = prefixedId(ID_PREFIXES.authorization, 'Authorization record');
export const TargetIdSchema = prefixedId(ID_PREFIXES.target, 'Target asset');
export const FindingIdSchema = prefixedId(ID_PREFIXES.finding, 'Finding');
export const EvidenceIdSchema = prefixedId(ID_PREFIXES.evidence, 'Evidence');
export const ArtifactIdSchema = prefixedId(ID_PREFIXES.artifact, 'Artifact');
export const PromptModuleIdSchema = prefixedId(ID_PREFIXES.promptModule, 'Prompt module');
export const PromptRenderIdSchema = prefixedId(ID_PREFIXES.promptRender, 'Prompt render');
export const MessageIdSchema = prefixedId(ID_PREFIXES.message, 'Engine message');
export const CorrelationIdSchema = prefixedId(ID_PREFIXES.correlation, 'Correlation');
export const ConversationIdSchema = prefixedId(ID_PREFIXES.conversation, 'Conversation');
export const EventIdSchema = prefixedId(ID_PREFIXES.event, 'Event');
export const SubscriptionIdSchema = prefixedId(ID_PREFIXES.subscription, 'Subscription');
export const PluginIdSchema = prefixedId(ID_PREFIXES.plugin, 'Plugin');
export const PluginInstanceIdSchema = prefixedId(ID_PREFIXES.pluginInstance, 'Plugin instance');
export const ToolIdSchema = prefixedId(ID_PREFIXES.tool, 'Tool');
export const ToolCallIdSchema = prefixedId(ID_PREFIXES.toolCall, 'Tool call');
export const EngineIdSchema = prefixedId(ID_PREFIXES.engine, 'Engine instance');
export const ModelIdSchema = prefixedId(ID_PREFIXES.model, 'Model registration');
export const ModelCallIdSchema = prefixedId(ID_PREFIXES.modelCall, 'Model call');
export const ProviderIdSchema = prefixedId(ID_PREFIXES.provider, 'Model provider registration');
export const ActorIdSchema = prefixedId(ID_PREFIXES.actor, 'Actor');
export const ApprovalIdSchema = prefixedId(ID_PREFIXES.approval, 'Approval');
export const AuditIdSchema = prefixedId(ID_PREFIXES.audit, 'Audit record');
export const TelemetryIdSchema = prefixedId(ID_PREFIXES.telemetry, 'Telemetry record');
export const TaskIdSchema = prefixedId(ID_PREFIXES.task, 'Task');
export const RunIdSchema = prefixedId(ID_PREFIXES.run, 'Run');
export const ReportIdSchema = prefixedId(ID_PREFIXES.report, 'Report');
export const TransactionIdSchema = prefixedId(ID_PREFIXES.transaction, 'Storage transaction');

export type SessionId = z.infer<typeof SessionIdSchema>;
export type SessionStepId = z.infer<typeof SessionStepIdSchema>;
export type EngagementId = z.infer<typeof EngagementIdSchema>;
export type AuthorizationId = z.infer<typeof AuthorizationIdSchema>;
export type TargetId = z.infer<typeof TargetIdSchema>;
export type FindingId = z.infer<typeof FindingIdSchema>;
export type EvidenceId = z.infer<typeof EvidenceIdSchema>;
export type ArtifactId = z.infer<typeof ArtifactIdSchema>;
export type PromptModuleId = z.infer<typeof PromptModuleIdSchema>;
export type PromptRenderId = z.infer<typeof PromptRenderIdSchema>;
export type MessageId = z.infer<typeof MessageIdSchema>;
export type CorrelationId = z.infer<typeof CorrelationIdSchema>;
export type ConversationId = z.infer<typeof ConversationIdSchema>;
export type EventId = z.infer<typeof EventIdSchema>;
export type SubscriptionId = z.infer<typeof SubscriptionIdSchema>;
export type PluginId = z.infer<typeof PluginIdSchema>;
export type PluginInstanceId = z.infer<typeof PluginInstanceIdSchema>;
export type ToolId = z.infer<typeof ToolIdSchema>;
export type ToolCallId = z.infer<typeof ToolCallIdSchema>;
export type EngineId = z.infer<typeof EngineIdSchema>;
export type ModelId = z.infer<typeof ModelIdSchema>;
export type ModelCallId = z.infer<typeof ModelCallIdSchema>;
export type ProviderId = z.infer<typeof ProviderIdSchema>;
export type ActorId = z.infer<typeof ActorIdSchema>;
export type ApprovalId = z.infer<typeof ApprovalIdSchema>;
export type AuditId = z.infer<typeof AuditIdSchema>;
export type TelemetryId = z.infer<typeof TelemetryIdSchema>;
export type TaskId = z.infer<typeof TaskIdSchema>;
export type RunId = z.infer<typeof RunIdSchema>;
export type ReportId = z.infer<typeof ReportIdSchema>;
export type TransactionId = z.infer<typeof TransactionIdSchema>;

/**
 * Logical name of an engine (the *role*, not the instance).
 * Engines are addressed by name on the message bus; instances get an `EngineId`.
 */
export const EngineNameSchema = z
  .enum([
    'orchestration',
    'planning',
    'prompt',
    'model-gateway',
    'tooling',
    'plugin-host',
    'knowledge',
    'evidence',
    'reporting',
    'policy',
    'audit',
    'telemetry',
    'storage',
    'ui-gateway',
  ])
  .describe('Logical engine role addressed on the message bus');
export type EngineName = z.infer<typeof EngineNameSchema>;

/**
 * A bus address: an engine role, optionally pinned to one instance
 * (`orchestration` or `orchestration/egn_01J…`), or `*` for broadcast.
 */
export const AddressSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^(\*|[a-z][a-z0-9-]{1,31}(\/(egn_[0-9A-HJKMNP-TV-Z]{26}|[a-z0-9-]{1,64}))?)$/)
  .describe('Bus address: "<engine>", "<engine>/<instance>" or "*"');
export type Address = z.infer<typeof AddressSchema>;
