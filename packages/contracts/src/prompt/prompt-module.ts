import { z } from 'zod';
import { ExtensionsSchema, JsonObjectSchema, JsonValueSchema } from '../common/json.js';
import {
  ActorIdSchema,
  PromptModuleIdSchema,
  PromptRenderIdSchema,
  SessionIdSchema,
} from '../common/ids.js';
import {
  ContentDigestSchema,
  DescriptionSchema,
  LabelSchema,
  LanguageTagSchema,
  SchemaVersionSchema,
  SemVerRangeSchema,
  SemVerSchema,
  SensitivitySchema,
  SlugSchema,
  TagsSchema,
  TimestampSchema,
  UnitIntervalSchema,
  UriSchema,
} from '../common/primitives.js';
import { ActivityClassSchema } from '../domain/target.js';
import { ModelCapabilitySchema } from '../model/provider.js';

/* -------------------------------------------------------------------------- */
/* Building blocks                                                             */
/* -------------------------------------------------------------------------- */

/**
 * What the module is for. The prompt engine composes a final prompt from at
 * most one `persona`, any number of `guardrail`s, one `task` and any number of
 * `fragment`s — the kind fixes the composition order (ADR-0006).
 */
export const PromptModuleKindSchema = z.enum([
  'persona', // who the assistant is
  'guardrail', // safety / legal / scope constraints, always injected
  'task', // the actual job to perform
  'fragment', // reusable snippet (formatting rules, glossary, …)
  'tool-instruction', // how to use a specific tool/plugin
  'output-format', // schema/shape instructions for structured output
  'evaluation', // rubric used to grade another module's output
  'report-template', // narrative generation for reporting
]);
export type PromptModuleKind = z.infer<typeof PromptModuleKindSchema>;

/** Chat role a rendered part maps to. */
export const PromptRoleSchema = z.enum(['system', 'developer', 'user', 'assistant', 'tool']);
export type PromptRole = z.infer<typeof PromptRoleSchema>;

/**
 * Templating dialect. `none` means the body is used verbatim — the safest
 * option and the default for guardrails, which must not be data-dependent.
 */
export const TemplateEngineSchema = z.enum(['none', 'mustache', 'handlebars', 'liquid', 'fstring']);
export type TemplateEngine = z.infer<typeof TemplateEngineSchema>;

/** A declared input variable. */
export const PromptVariableSchema = z.strictObject({
  name: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
  description: DescriptionSchema.optional(),
  type: z.enum(['string', 'number', 'integer', 'boolean', 'object', 'array', 'json']),
  required: z.boolean(),
  /** JSON Schema (2020-12) fragment further constraining the value. */
  schema: JsonObjectSchema.optional(),
  default: JsonValueSchema.optional(),
  /** Example value used by docs and by the module's self-test. */
  example: JsonValueSchema.optional(),
  /** Max characters after stringification; the renderer truncates or fails. */
  maxLength: z.int().min(1).optional(),
  /** Data class of the value; gates which providers may see the render. */
  sensitivity: SensitivitySchema.optional(),
  /**
   * How untrusted content (tool output, scraped pages, target responses) is
   * neutralised before interpolation. Defaults to `fenced` for `untrusted`.
   */
  trust: z.enum(['trusted', 'untrusted']).optional(),
  sanitizer: z.enum(['none', 'escape', 'fenced', 'strip-control-chars', 'json-stringify']).optional(),
});
export type PromptVariable = z.infer<typeof PromptVariableSchema>;

/** One renderable part of the module body. */
export const PromptPartSchema = z.strictObject({
  role: PromptRoleSchema,
  /** Template body in the module's `templateEngine` dialect. */
  content: z.string().min(1).max(200_000),
  /** Render this part only when the named boolean variable is truthy. */
  when: z.string().max(200).optional(),
  /** Ordering hint within the same role; lower renders first. */
  order: z.int().optional(),
  /** Marks a part as cacheable by providers that support prefix caching. */
  cacheable: z.boolean().optional(),
});
export type PromptPart = z.infer<typeof PromptPartSchema>;

/** Few-shot example, also used as a regression fixture. */
export const PromptExampleSchema = z.strictObject({
  name: LabelSchema.optional(),
  variables: JsonObjectSchema,
  /** Expected assistant output (verbatim or a description of the shape). */
  expectedOutput: z.string().max(20_000).optional(),
  /** When true, the example is injected into the prompt as a few-shot pair. */
  inject: z.boolean().optional(),
});
export type PromptExample = z.infer<typeof PromptExampleSchema>;

/** Automated check the prompt engine can run in CI against a module. */
export const PromptEvaluationSchema = z.strictObject({
  name: LabelSchema,
  kind: z.enum(['contains', 'not-contains', 'regex', 'json-schema', 'llm-rubric', 'exact']),
  /** Semantics depend on `kind`: substring, pattern, schema or rubric text. */
  criterion: z.string().max(20_000),
  variables: JsonObjectSchema.optional(),
  /** Minimum score (0–1) for an `llm-rubric` check to pass. */
  threshold: UnitIntervalSchema.optional(),
  severity: z.enum(['warning', 'error']).optional(),
});
export type PromptEvaluation = z.infer<typeof PromptEvaluationSchema>;

/* -------------------------------------------------------------------------- */
/* Prompt module                                                               */
/* -------------------------------------------------------------------------- */

export const PromptModuleStatusSchema = z.enum(['draft', 'review', 'approved', 'deprecated', 'revoked']);

export const PromptModuleSchema = z
  .strictObject({
    schemaVersion: SchemaVersionSchema,
    id: PromptModuleIdSchema,
    /** Stable, human-writable key, e.g. `recon.http-fingerprint`. */
    key: SlugSchema,
    version: SemVerSchema,
    kind: PromptModuleKindSchema,
    title: LabelSchema,
    description: DescriptionSchema.optional(),
    status: PromptModuleStatusSchema,
    language: LanguageTagSchema.optional(),

    /** Composition ------------------------------------------------------- */
    templateEngine: TemplateEngineSchema,
    parts: z.array(PromptPartSchema).min(1).max(64),
    /** Modules merged in before this one, by `key@range`. */
    extends: z.array(z.string().max(160)).max(16).optional(),
    /** Modules that must also be present when this one is used. */
    requires: z.array(z.string().max(160)).max(32).optional(),
    /** Modules that must NOT be combined with this one. */
    conflictsWith: z.array(z.string().max(160)).max(32).optional(),
    /** Composition weight; lower renders earlier within the same kind. */
    priority: z.int().min(0).max(1000).optional(),

    /** I/O contract ------------------------------------------------------ */
    variables: z.array(PromptVariableSchema).max(64).optional(),
    /** JSON Schema the model output must satisfy (structured output). */
    outputSchema: JsonObjectSchema.optional(),
    /** Preferred decoding strategy for the output. */
    outputFormat: z.enum(['text', 'markdown', 'json', 'json-schema', 'tool-calls']).optional(),
    /** Tool names this module expects to be available. */
    expectedTools: z.array(SlugSchema).max(64).optional(),

    /** Model requirements ------------------------------------------------ */
    modelRequirements: z
      .strictObject({
        minContextTokens: z.int().min(1).optional(),
        maxOutputTokens: z.int().min(1).optional(),
        /** Uses the same vocabulary as `ModelDescriptor.capabilities`. */
        capabilities: z.array(ModelCapabilitySchema).max(16).optional(),
        preferredModels: z.array(z.string().max(200)).max(16).optional(),
        temperature: z.number().min(0).max(2).optional(),
        topP: z.number().min(0).max(1).optional(),
        stopSequences: z.array(z.string().max(64)).max(8).optional(),
        /** Estimated prompt size, used for planning and budget checks. */
        estimatedPromptTokens: z.int().min(0).optional(),
      })
      .optional(),

    /** Safety ------------------------------------------------------------ */
    safety: z
      .strictObject({
        /** Activity classes this module may cause; checked against the ROE. */
        activityClasses: z.array(ActivityClassSchema).max(16).optional(),
        /** Human approval required before the rendered prompt is executed. */
        requiresApproval: z.boolean().optional(),
        /** Refuse to render when the session scope cannot be resolved. */
        requiresScope: z.boolean().optional(),
        /** Highest data class the rendered prompt may contain. */
        maxSensitivity: SensitivitySchema.optional(),
        /** Never send this module's render to a non-local provider. */
        localModelsOnly: z.boolean().optional(),
        /** Free-text notes for reviewers. */
        reviewNotes: DescriptionSchema.optional(),
      })
      .optional(),

    /** Quality ----------------------------------------------------------- */
    examples: z.array(PromptExampleSchema).max(32).optional(),
    evaluations: z.array(PromptEvaluationSchema).max(64).optional(),

    /** Provenance -------------------------------------------------------- */
    author: z.string().max(200).optional(),
    ownerActorId: ActorIdSchema.optional(),
    license: z.string().max(64).optional(),
    references: z.array(UriSchema).max(32).optional(),
    /** Digest of the canonicalised module; changes on every content edit. */
    contentDigest: ContentDigestSchema.optional(),
    /** Compatible contracts range, e.g. `^0.1.0`. */
    contractsRange: SemVerRangeSchema.optional(),
    createdAt: TimestampSchema.optional(),
    updatedAt: TimestampSchema.optional(),
    deprecatedBy: z.string().max(160).optional(),
    tags: TagsSchema.optional(),
    metadata: JsonObjectSchema.optional(),
    extensions: ExtensionsSchema.optional(),
  })
  .meta({
    id: 'PromptModule',
    title: 'Prompt module',
    description:
      'A versioned, composable, testable prompt unit with a declared input/output contract and safety metadata.',
  });
export type PromptModule = z.infer<typeof PromptModuleSchema>;

/* -------------------------------------------------------------------------- */
/* Rendering                                                                   */
/* -------------------------------------------------------------------------- */

export const PromptRenderRequestSchema = z
  .strictObject({
    /** Either an explicit module id or a `key@range` selector. */
    moduleId: PromptModuleIdSchema.optional(),
    moduleKey: SlugSchema.optional(),
    versionRange: SemVerRangeSchema.optional(),
    sessionId: SessionIdSchema.optional(),
    variables: JsonObjectSchema.optional(),
    /** Additional module keys to compose in (guardrails, personas, …). */
    compose: z.array(z.string().max(160)).max(32).optional(),
    /** Fail instead of truncating when the render exceeds the token budget. */
    strictTokenBudget: z.boolean().optional(),
    maxPromptTokens: z.int().min(1).optional(),
  })
  .meta({ id: 'PromptRenderRequest', title: 'Prompt render request' });
export type PromptRenderRequest = z.infer<typeof PromptRenderRequestSchema>;

/** A rendered, immutable prompt ready for the model gateway. */
export const RenderedPromptSchema = z
  .strictObject({
    id: PromptRenderIdSchema,
    /** Exact modules (key@version) that contributed, in composition order. */
    composedFrom: z.array(z.string().max(160)).min(1).max(64),
    messages: z
      .array(
        z.strictObject({
          role: PromptRoleSchema,
          content: z.string(),
          cacheable: z.boolean().optional(),
        }),
      )
      .min(1),
    outputSchema: JsonObjectSchema.optional(),
    estimatedTokens: z.int().min(0).optional(),
    /** Digest over messages; lets audit prove what the model actually saw. */
    digest: ContentDigestSchema.optional(),
    renderedAt: TimestampSchema,
    truncated: z.boolean().optional(),
    warnings: z.array(LabelSchema.max(500)).max(32).optional(),
    extensions: ExtensionsSchema.optional(),
  })
  .meta({ id: 'RenderedPrompt', title: 'Rendered prompt' });
export type RenderedPrompt = z.infer<typeof RenderedPromptSchema>;
