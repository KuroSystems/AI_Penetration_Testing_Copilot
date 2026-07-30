import { z } from 'zod';
import { ExtensionsSchema, JsonObjectSchema } from '../common/json.js';
import {
  ActorIdSchema,
  AuthorizationIdSchema,
  EngagementIdSchema,
  TargetIdSchema,
} from '../common/ids.js';
import {
  CidrSchema,
  DescriptionSchema,
  HostnameSchema,
  IpAddressSchema,
  LabelSchema,
  PortRangeSchema,
  Sha256Schema,
  SensitivitySchema,
  TagsSchema,
  TimestampSchema,
  TransportProtocolSchema,
  UriSchema,
} from '../common/primitives.js';

/* -------------------------------------------------------------------------- */
/* Target assets                                                               */
/* -------------------------------------------------------------------------- */

export const TargetKindSchema = z.enum([
  'host',
  'ip-range',
  'domain',
  'url',
  'web-application',
  'api',
  'mobile-application',
  'cloud-account',
  'cloud-resource',
  'repository',
  'container-image',
  'binary',
  'network-segment',
  'wireless-network',
  'identity',
  'physical-site',
  'social-engineering-target',
  'other',
]);
export type TargetKind = z.infer<typeof TargetKindSchema>;

/** Where a target lives, for reporting and for egress policy. */
export const EnvironmentSchema = z.enum(['production', 'staging', 'development', 'test', 'lab', 'unknown']);

/**
 * Concrete asset under test. `identifier` is the canonical string form for the
 * kind (hostname, CIDR, URL, ARN, repo URL, …); the typed fields below are
 * optional refinements a scope checker can use without re-parsing strings.
 */
export const TargetAssetSchema = z
  .strictObject({
    id: TargetIdSchema,
    kind: TargetKindSchema,
    identifier: z.string().min(1).max(2_048).describe('Canonical string form of the asset'),
    displayName: LabelSchema.optional(),
    description: DescriptionSchema.optional(),
    hostnames: z.array(HostnameSchema).max(256).optional(),
    ipAddresses: z.array(IpAddressSchema).max(1_024).optional(),
    cidrs: z.array(CidrSchema).max(256).optional(),
    urls: z.array(UriSchema).max(256).optional(),
    ports: z.array(PortRangeSchema).max(128).optional(),
    protocols: z.array(TransportProtocolSchema).max(8).optional(),
    environment: EnvironmentSchema.optional(),
    /** Business criticality 1 (low) – 5 (mission critical). */
    criticality: z.int().min(1).max(5).optional(),
    dataSensitivity: SensitivitySchema.optional(),
    owner: z.string().max(200).optional(),
    tags: TagsSchema.optional(),
    /** Free-form facts discovered about the asset (OS, tech stack, …). */
    attributes: JsonObjectSchema.optional(),
    extensions: ExtensionsSchema.optional(),
  })
  .meta({
    id: 'TargetAsset',
    title: 'Target asset',
    description: 'A single asset that may be tested, subject to scope rules.',
  });
export type TargetAsset = z.infer<typeof TargetAssetSchema>;

/* -------------------------------------------------------------------------- */
/* Scope                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * A scope rule. Rules are evaluated *deny-first*: if any `exclude` rule matches
 * the action's target, the action is out of scope regardless of includes.
 * A target that matches no rule is out of scope (default deny) — see ADR-0012.
 */
export const ScopeRuleSchema = z.strictObject({
  effect: z.enum(['include', 'exclude']),
  kind: TargetKindSchema.optional(),
  /**
   * Match expression appropriate to `kind`: hostname (wildcards allowed), CIDR,
   * URL prefix, ARN glob, etc. Matching semantics are defined by the policy
   * engine in a later phase; this contract only fixes the shape.
   */
  pattern: z.string().min(1).max(2_048),
  ports: z.array(PortRangeSchema).max(64).optional(),
  protocols: z.array(TransportProtocolSchema).max(8).optional(),
  note: DescriptionSchema.optional(),
});
export type ScopeRule = z.infer<typeof ScopeRuleSchema>;

/** Classes of activity that are separately authorised. */
export const ActivityClassSchema = z.enum([
  'passive-recon',
  'active-scan',
  'vulnerability-scan',
  'authenticated-scan',
  'exploitation',
  'post-exploitation',
  'lateral-movement',
  'privilege-escalation',
  'persistence',
  'data-exfiltration-simulation',
  'denial-of-service',
  'social-engineering',
  'physical',
  'wireless',
  'source-code-review',
  'configuration-review',
]);
export type ActivityClass = z.infer<typeof ActivityClassSchema>;

/** Rules of engagement: the operational constraints agreed with the client. */
export const RulesOfEngagementSchema = z
  .strictObject({
    allowedActivities: z.array(ActivityClassSchema).min(1).max(32),
    forbiddenActivities: z.array(ActivityClassSchema).max(32).optional(),
    /** Testing windows in which active activity is permitted. */
    testingWindows: z
      .array(
        z.strictObject({
          startsAt: TimestampSchema,
          endsAt: TimestampSchema,
          note: DescriptionSchema.optional(),
        }),
      )
      .max(64)
      .optional(),
    /** Hard ceilings the orchestration engine must enforce. */
    maxRequestsPerSecond: z.number().min(0).optional(),
    maxConcurrentTasks: z.int().min(1).optional(),
    /** Activities that always need a human approval before execution. */
    requiresApprovalFor: z.array(ActivityClassSchema).max(32).optional(),
    /** Whether target data may be sent to a non-local model provider. */
    allowRemoteModelEgress: z.boolean().optional(),
    dataHandling: SensitivitySchema.optional(),
    emergencyContact: z.string().max(500).optional(),
    /** Free text clauses that a human must read; never machine-interpreted. */
    notes: DescriptionSchema.optional(),
  })
  .meta({ id: 'RulesOfEngagement', title: 'Rules of engagement' });
export type RulesOfEngagement = z.infer<typeof RulesOfEngagementSchema>;

export const EngagementScopeSchema = z
  .strictObject({
    engagementId: EngagementIdSchema,
    name: LabelSchema,
    description: DescriptionSchema.optional(),
    client: z.string().max(200).optional(),
    /** Ordered rules; deny-first evaluation, default deny. */
    rules: z.array(ScopeRuleSchema).min(1).max(1_000),
    targets: z.array(TargetAssetSchema).max(10_000).optional(),
    rulesOfEngagement: RulesOfEngagementSchema,
    startsAt: TimestampSchema.optional(),
    endsAt: TimestampSchema.optional(),
    tags: TagsSchema.optional(),
    extensions: ExtensionsSchema.optional(),
  })
  .meta({
    id: 'EngagementScope',
    title: 'Engagement scope',
    description: 'Authoritative definition of what may be tested and how.',
  });
export type EngagementScope = z.infer<typeof EngagementScopeSchema>;

/* -------------------------------------------------------------------------- */
/* Authorization                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Proof that testing was authorised. No session may leave `draft` without one
 * (ADR-0012). The copilot never verifies signatures itself in Phase 0 — it only
 * guarantees the record exists, is in-date and is auditable.
 */
export const AuthorizationRecordSchema = z
  .strictObject({
    id: AuthorizationIdSchema,
    engagementId: EngagementIdSchema,
    /** How the authorisation was obtained. */
    method: z.enum(['signed-document', 'ticket', 'email', 'verbal-attested', 'lab-self-owned', 'bug-bounty-program']),
    /** Person who granted permission (client side). */
    grantedBy: z.string().max(200),
    grantedByRole: z.string().max(200).optional(),
    /** Operator who attested/recorded it inside the copilot. */
    attestedBy: ActorIdSchema,
    grantedAt: TimestampSchema,
    validFrom: TimestampSchema,
    validUntil: TimestampSchema,
    /** Reference to the stored document (artifact id, ticket URL, …). */
    documentRef: z.string().max(2_048).optional(),
    documentHash: Sha256Schema.optional(),
    /** Bug bounty / VDP policy URL when `method === 'bug-bounty-program'`. */
    programUrl: UriSchema.optional(),
    revokedAt: TimestampSchema.optional(),
    revocationReason: DescriptionSchema.optional(),
    notes: DescriptionSchema.optional(),
    extensions: ExtensionsSchema.optional(),
  })
  .meta({
    id: 'AuthorizationRecord',
    title: 'Authorization record',
    description: 'Evidence that the engagement is legally authorised, with validity window.',
  });
export type AuthorizationRecord = z.infer<typeof AuthorizationRecordSchema>;
