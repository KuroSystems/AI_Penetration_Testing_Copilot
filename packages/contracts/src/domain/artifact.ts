import { z } from 'zod';
import { ExtensionsSchema, JsonObjectSchema } from '../common/json.js';
import { ActorIdSchema, ArtifactIdSchema, SessionIdSchema, TargetIdSchema } from '../common/ids.js';
import {
  ContentDigestSchema,
  DescriptionSchema,
  LabelSchema,
  MediaTypeSchema,
  RedactionRuleSchema,
  SensitivitySchema,
  TagsSchema,
  TimestampSchema,
} from '../common/primitives.js';

/**
 * Artifacts are the *bytes* the copilot produces or captures: raw tool output,
 * a screenshot, a PCAP, a rendered report. Metadata lives in the repository,
 * bytes live behind a `BlobStore` (see `storage/repository.ts`) so that the
 * local-file implementation can later be swapped without touching contracts.
 */
export const ArtifactKindSchema = z.enum([
  'tool-output',
  'http-transcript',
  'network-capture',
  'screenshot',
  'log',
  'file',
  'source-snippet',
  'command-transcript',
  'model-transcript',
  'report',
  'diff',
  'other',
]);
export type ArtifactKind = z.infer<typeof ArtifactKindSchema>;

/** Pointer to blob content. Exactly one of `uri` / `inline` should be set. */
export const BlobRefSchema = z
  .strictObject({
    /** Location understood by the blob store, e.g. `blob://sha256/<hex>`. */
    uri: z.string().max(2_048).optional(),
    /** Small payloads may be inlined (base64) to avoid a store round-trip. */
    inlineBase64: z.string().max(1_048_576).optional(),
    mediaType: MediaTypeSchema,
    sizeBytes: z.int().min(0).optional(),
    digest: ContentDigestSchema.optional(),
    encoding: z.enum(['identity', 'gzip', 'zstd', 'br']).optional(),
  })
  .meta({ id: 'BlobRef', title: 'Blob reference' });
export type BlobRef = z.infer<typeof BlobRefSchema>;

export const ArtifactSchema = z
  .strictObject({
    id: ArtifactIdSchema,
    kind: ArtifactKindSchema,
    name: LabelSchema,
    description: DescriptionSchema.optional(),
    sessionId: SessionIdSchema.optional(),
    targetId: TargetIdSchema.optional(),
    /** What produced it: engine name, plugin id, tool name or model ref. */
    producedBy: z.string().max(200).optional(),
    producedAt: TimestampSchema,
    createdBy: ActorIdSchema.optional(),
    content: BlobRefSchema,
    sensitivity: SensitivitySchema.optional(),
    /** Redactions already applied (or required before export). */
    redactions: z.array(RedactionRuleSchema).max(200).optional(),
    /** Chain-of-custody: hash recorded at capture time, verified on read. */
    integrityDigest: ContentDigestSchema.optional(),
    retainUntil: TimestampSchema.optional(),
    tags: TagsSchema.optional(),
    metadata: JsonObjectSchema.optional(),
    extensions: ExtensionsSchema.optional(),
  })
  .meta({
    id: 'Artifact',
    title: 'Artifact',
    description: 'Byte-level output captured during an engagement, with custody metadata.',
  });
export type Artifact = z.infer<typeof ArtifactSchema>;
