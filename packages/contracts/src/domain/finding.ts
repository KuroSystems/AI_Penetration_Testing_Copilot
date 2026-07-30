import { z } from 'zod';
import { ExtensionsSchema, JsonObjectSchema } from '../common/json.js';
import {
  ActorIdSchema,
  ArtifactIdSchema,
  EvidenceIdSchema,
  FindingIdSchema,
  SessionIdSchema,
  TargetIdSchema,
} from '../common/ids.js';
import {
  DescriptionSchema,
  LabelSchema,
  TagsSchema,
  TimestampSchema,
  UnitIntervalSchema,
  UriSchema,
} from '../common/primitives.js';
import { ActivityClassSchema } from './target.js';

/* -------------------------------------------------------------------------- */
/* Evidence                                                                    */
/* -------------------------------------------------------------------------- */

export const EvidenceKindSchema = z.enum([
  'observation',
  'request-response',
  'command-output',
  'screenshot',
  'file-content',
  'configuration',
  'log-excerpt',
  'proof-of-concept',
  'model-reasoning',
  'third-party-report',
]);

/**
 * A single piece of support for a finding.
 *
 * Evidence is deliberately separate from `Artifact`: the artifact holds bytes,
 * the evidence holds the *claim* those bytes support, who/what produced it and
 * how much we trust it. Reporting joins the two.
 */
export const EvidenceSchema = z
  .strictObject({
    id: EvidenceIdSchema,
    kind: EvidenceKindSchema,
    summary: LabelSchema.max(500),
    detail: DescriptionSchema.optional(),
    collectedAt: TimestampSchema,
    collectedBy: ActorIdSchema.optional(),
    sessionId: SessionIdSchema.optional(),
    targetId: TargetIdSchema.optional(),
    /** Bytes backing this evidence, if any. */
    artifactIds: z.array(ArtifactIdSchema).max(64).optional(),
    /** Exact command / request that produced it, for reproducibility. */
    reproduction: z
      .strictObject({
        tool: z.string().max(200).optional(),
        command: z.string().max(8_000).optional(),
        request: z.string().max(16_000).optional(),
        response: z.string().max(16_000).optional(),
        notes: DescriptionSchema.optional(),
      })
      .optional(),
    /** 0–1 confidence that this evidence means what it claims. */
    confidence: UnitIntervalSchema.optional(),
    /** True when a human has eyeballed and confirmed it. */
    humanVerified: z.boolean().optional(),
    extensions: ExtensionsSchema.optional(),
  })
  .meta({
    id: 'Evidence',
    title: 'Evidence',
    description: 'A verifiable observation supporting or refuting a finding.',
  });
export type Evidence = z.infer<typeof EvidenceSchema>;

/* -------------------------------------------------------------------------- */
/* Severity & scoring                                                          */
/* -------------------------------------------------------------------------- */

export const SeveritySchema = z.enum(['info', 'low', 'medium', 'high', 'critical']);
export type Severity = z.infer<typeof SeveritySchema>;

export const CvssSchema = z.strictObject({
  version: z.enum(['2.0', '3.0', '3.1', '4.0']),
  /** Vector string, e.g. `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H`. */
  vector: z.string().min(1).max(256),
  baseScore: z.number().min(0).max(10),
  temporalScore: z.number().min(0).max(10).optional(),
  environmentalScore: z.number().min(0).max(10).optional(),
});
export type Cvss = z.infer<typeof CvssSchema>;

/** External classification references. All optional; all repeatable. */
export const ClassificationSchema = z.strictObject({
  cwe: z.array(z.string().regex(/^CWE-\d{1,5}$/)).max(16).optional(),
  cve: z.array(z.string().regex(/^CVE-\d{4}-\d{4,7}$/)).max(64).optional(),
  owaspTop10: z.array(z.string().max(32)).max(16).optional(),
  owaspAsvs: z.array(z.string().max(32)).max(32).optional(),
  mitreAttack: z
    .array(z.string().regex(/^T\d{4}(\.\d{3})?$/))
    .max(32)
    .optional(),
  capec: z.array(z.string().regex(/^CAPEC-\d{1,5}$/)).max(16).optional(),
  compliance: z.array(z.string().max(64)).max(32).optional(),
});
export type Classification = z.infer<typeof ClassificationSchema>;

/* -------------------------------------------------------------------------- */
/* Finding                                                                     */
/* -------------------------------------------------------------------------- */

export const FindingStatusSchema = z.enum([
  'draft',
  'proposed', // produced by an engine/model, not yet reviewed
  'confirmed',
  'false-positive',
  'duplicate',
  'accepted-risk',
  'remediated',
  'withdrawn',
]);
export type FindingStatus = z.infer<typeof FindingStatusSchema>;

export const FindingSchema = z
  .strictObject({
    id: FindingIdSchema,
    /** Stable dedup key derived from (target, weakness, location). */
    fingerprint: z.string().max(200).optional(),
    title: LabelSchema,
    summary: DescriptionSchema,
    /** Full technical narrative (markdown). */
    detail: DescriptionSchema.optional(),
    status: FindingStatusSchema,
    severity: SeveritySchema,
    /** How sure the system is that this is real, 0–1. */
    confidence: UnitIntervalSchema.optional(),
    cvss: CvssSchema.optional(),
    classification: ClassificationSchema.optional(),
    sessionId: SessionIdSchema.optional(),
    targetIds: z.array(TargetIdSchema).max(256).optional(),
    /** Precise location: URL + parameter, file + line, resource ARN, … */
    location: z
      .strictObject({
        uri: z.string().max(2_048).optional(),
        parameter: z.string().max(200).optional(),
        method: z.string().max(16).optional(),
        filePath: z.string().max(1_024).optional(),
        line: z.int().min(1).optional(),
        component: z.string().max(200).optional(),
      })
      .optional(),
    evidenceIds: z.array(EvidenceIdSchema).max(256).optional(),
    /** Inline evidence for transport contexts that cannot resolve ids. */
    evidence: z.array(EvidenceSchema).max(64).optional(),
    impact: DescriptionSchema.optional(),
    likelihood: SeveritySchema.optional(),
    remediation: z
      .strictObject({
        summary: DescriptionSchema,
        effort: z.enum(['trivial', 'low', 'medium', 'high']).optional(),
        references: z.array(UriSchema).max(32).optional(),
      })
      .optional(),
    /** Which activity class produced it — used to prove ROE compliance. */
    discoveredVia: ActivityClassSchema.optional(),
    discoveredAt: TimestampSchema,
    reportedBy: ActorIdSchema.optional(),
    reviewedBy: ActorIdSchema.optional(),
    reviewedAt: TimestampSchema.optional(),
    duplicateOf: FindingIdSchema.optional(),
    tags: TagsSchema.optional(),
    metadata: JsonObjectSchema.optional(),
    extensions: ExtensionsSchema.optional(),
  })
  .meta({
    id: 'Finding',
    title: 'Finding',
    description: 'A security weakness observed during an engagement, with evidence and scoring.',
  });
export type Finding = z.infer<typeof FindingSchema>;
