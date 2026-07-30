import { z } from 'zod';
import { ExtensionsSchema, JsonObjectSchema } from '../common/json.js';
import { PluginIdSchema } from '../common/ids.js';
import {
  ContentDigestSchema,
  DescriptionSchema,
  DurationMsSchema,
  LabelSchema,
  SchemaVersionSchema,
  SemVerRangeSchema,
  SemVerSchema,
  SensitivitySchema,
  SlugSchema,
  TagsSchema,
  TimestampSchema,
  UriSchema,
} from '../common/primitives.js';
import { ActivityClassSchema } from '../domain/target.js';
import { MessageNameSchema, TopicPatternSchema } from '../messaging/envelope.js';

/* -------------------------------------------------------------------------- */
/* Tools                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * A tool a plugin exposes. This is the same declaration the model gateway turns
 * into a provider-specific function/tool definition, so plugin authors write it
 * once (ADR-0008/ADR-0009).
 */
export const ToolDefinitionSchema = z.strictObject({
  /** Unique within the plugin; the host namespaces it as `<plugin>.<name>`. */
  name: SlugSchema,
  title: LabelSchema.optional(),
  description: DescriptionSchema,
  /** JSON Schema (2020-12) for the arguments object. */
  inputSchema: JsonObjectSchema,
  /** JSON Schema for the result; enables validation before it reaches a model. */
  outputSchema: JsonObjectSchema.optional(),
  /** No side effects; safe to call speculatively or in `dry-run` sessions. */
  readOnly: z.boolean().optional(),
  /** Same arguments always produce the same effect. */
  idempotent: z.boolean().optional(),
  /** Testing activity this tool performs; checked against the ROE. */
  activityClasses: z.array(ActivityClassSchema).max(8).optional(),
  /** Human approval required before every invocation. */
  requiresApproval: z.boolean().optional(),
  /** Highest data class this tool may receive. */
  maxInputSensitivity: SensitivitySchema.optional(),
  /** Suggested per-call timeout; the host may lower it. */
  timeoutMs: DurationMsSchema.optional(),
  /** Rough cost hint for the planner (1 = cheap, 5 = very expensive/slow). */
  costHint: z.int().min(1).max(5).optional(),
  examples: z
    .array(z.strictObject({ description: LabelSchema.optional(), arguments: JsonObjectSchema }))
    .max(16)
    .optional(),
});
export type ToolDefinition = z.infer<typeof ToolDefinitionSchema>;

/* -------------------------------------------------------------------------- */
/* Permissions & sandboxing                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Capability-based permissions. Everything is denied unless requested here and
 * granted at install time; the host enforces, the manifest only declares.
 */
export const PluginPermissionsSchema = z.strictObject({
  /** Outbound network access. `scope-targets` = only in-scope assets. */
  network: z
    .strictObject({
      mode: z.enum(['none', 'scope-targets', 'allowlist', 'any']),
      allowHosts: z.array(z.string().max(253)).max(256).optional(),
      allowPorts: z.array(z.int().min(0).max(65_535)).max(128).optional(),
      allowProtocols: z.array(z.enum(['http', 'https', 'tcp', 'udp', 'dns', 'ssh', 'ftp', 'smb'])).max(16).optional(),
    })
    .optional(),
  filesystem: z
    .strictObject({
      mode: z.enum(['none', 'workspace', 'allowlist', 'any']),
      readPaths: z.array(z.string().max(1_024)).max(64).optional(),
      writePaths: z.array(z.string().max(1_024)).max(64).optional(),
    })
    .optional(),
  /** External binaries the plugin shells out to (nmap, sqlmap, …). */
  process: z
    .strictObject({
      mode: z.enum(['none', 'allowlist']),
      allowBinaries: z.array(z.string().max(200)).max(64).optional(),
    })
    .optional(),
  /** Environment variables the plugin may read. Never secrets by default. */
  environment: z.array(z.string().max(128)).max(64).optional(),
  /** Model access: whether the plugin may call the model gateway itself. */
  model: z
    .strictObject({
      allowed: z.boolean(),
      localOnly: z.boolean().optional(),
      maxCallsPerInvocation: z.int().min(0).optional(),
    })
    .optional(),
  /** Repository collections the plugin may read/write through the host API. */
  storage: z
    .strictObject({
      read: z.array(SlugSchema).max(32).optional(),
      write: z.array(SlugSchema).max(32).optional(),
      /** Private key-value space scoped to the plugin. */
      privateState: z.boolean().optional(),
    })
    .optional(),
  /** Events the plugin may subscribe to. Publishing is always host-mediated. */
  events: z
    .strictObject({
      subscribe: z.array(TopicPatternSchema).max(64).optional(),
    })
    .optional(),
  /** Engine operations the plugin may call. */
  engineCalls: z.array(MessageNameSchema).max(64).optional(),
  /** Maximum data class the plugin may ever observe. */
  maxSensitivity: SensitivitySchema.optional(),
});
export type PluginPermissions = z.infer<typeof PluginPermissionsSchema>;

export const PluginResourceLimitsSchema = z.strictObject({
  maxMemoryMb: z.int().min(16).max(65_536).optional(),
  maxCpuPercent: z.int().min(1).max(100).optional(),
  maxInvocationMs: DurationMsSchema.optional(),
  maxConcurrentInvocations: z.int().min(1).max(1_024).optional(),
  maxOutputBytes: z.int().min(1).optional(),
  maxDiskWriteBytes: z.int().min(0).optional(),
});
export type PluginResourceLimits = z.infer<typeof PluginResourceLimitsSchema>;

/* -------------------------------------------------------------------------- */
/* Runtime                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * How the host executes the plugin. `in-process` is fastest and least safe and
 * is reserved for first-party, signed plugins; everything else is isolated.
 */
export const PluginRuntimeSchema = z.strictObject({
  kind: z.enum(['in-process', 'worker-thread', 'child-process', 'wasm', 'container', 'mcp-server']),
  /** Module/binary entry point, relative to the plugin root. */
  entry: z.string().min(1).max(512),
  /** Node/wasm/runtime version range the plugin needs. */
  runtimeVersion: SemVerRangeSchema.optional(),
  /** Command + args for `child-process` / `mcp-server` runtimes. */
  command: z.string().max(512).optional(),
  args: z.array(z.string().max(512)).max(64).optional(),
  /** Working directory relative to the plugin root. */
  cwd: z.string().max(512).optional(),
  /** Transport for `mcp-server`: how the host talks to it. */
  transport: z.enum(['stdio', 'http', 'unix-socket']).optional(),
  /** Restart policy after a crash. */
  restart: z.enum(['never', 'on-failure', 'always']).optional(),
  healthCheckIntervalMs: DurationMsSchema.optional(),
});
export type PluginRuntime = z.infer<typeof PluginRuntimeSchema>;

/** What the plugin contributes to the system. */
export const PluginContributionsSchema = z.strictObject({
  tools: z.array(ToolDefinitionSchema).max(128).optional(),
  /** Prompt module keys shipped in the plugin's `prompts/` directory. */
  promptModules: z.array(SlugSchema).max(128).optional(),
  /** Report templates by key. */
  reportTemplates: z.array(SlugSchema).max(64).optional(),
  /** Knowledge packs (checklists, payload lists, methodology docs). */
  knowledgePacks: z.array(SlugSchema).max(64).optional(),
  /** Named model providers the plugin registers (see model/provider.ts). */
  modelProviders: z.array(SlugSchema).max(16).optional(),
  /** Event subscriptions the plugin installs on activation. */
  eventSubscriptions: z.array(TopicPatternSchema).max(64).optional(),
});
export type PluginContributions = z.infer<typeof PluginContributionsSchema>;

/* -------------------------------------------------------------------------- */
/* Manifest                                                                    */
/* -------------------------------------------------------------------------- */

export const PluginManifestSchema = z
  .strictObject({
    /** Contract version this manifest conforms to. */
    schemaVersion: SchemaVersionSchema,
    /** Assigned by the host at install time; absent in a source manifest. */
    id: PluginIdSchema.optional(),
    /** Globally unique, reverse-DNS-ish name, e.g. `aiptc.recon-nmap`. */
    name: SlugSchema,
    version: SemVerSchema,
    displayName: LabelSchema,
    description: DescriptionSchema,
    /** Compatible contracts package range — the compatibility gate. */
    contractsRange: SemVerRangeSchema,
    /** Compatible host application range. */
    hostRange: SemVerRangeSchema.optional(),

    author: z.string().max(200).optional(),
    license: z.string().max(64).optional(),
    homepage: UriSchema.optional(),
    repository: UriSchema.optional(),
    issues: UriSchema.optional(),
    category: z
      .enum(['recon', 'scanning', 'exploitation', 'post-exploitation', 'reporting', 'integration', 'model-provider', 'utility'])
      .optional(),
    keywords: TagsSchema.optional(),

    runtime: PluginRuntimeSchema,
    contributes: PluginContributionsSchema.optional(),
    permissions: PluginPermissionsSchema,
    limits: PluginResourceLimitsSchema.optional(),

    /** JSON Schema for user-supplied plugin settings. */
    configSchema: JsonObjectSchema.optional(),
    /** Default settings; must validate against `configSchema`. */
    defaultConfig: JsonObjectSchema.optional(),
    /**
     * Lazy activation triggers: `onStartup`, `onSession`,
     * `onTool:<name>`, `onEvent:<pattern>`, `onPhase:<phase>`.
     */
    activationEvents: z.array(z.string().max(160)).max(64).optional(),

    /** Other plugins required, by `name@range`. */
    dependencies: z.array(z.string().max(200)).max(32).optional(),
    /** External binaries that must exist on PATH, with optional version range. */
    systemRequirements: z
      .array(z.strictObject({ binary: z.string().max(200), versionRange: SemVerRangeSchema.optional() }))
      .max(32)
      .optional(),

    /** Supply chain -------------------------------------------------------*/
    /** Digest of the packaged plugin bundle. */
    integrity: ContentDigestSchema.optional(),
    signature: z
      .strictObject({
        algorithm: z.enum(['ed25519', 'ecdsa-p256', 'rsa-pss-sha256', 'minisign', 'cosign']),
        publicKeyId: z.string().max(200),
        value: z.string().max(4_096),
        signedAt: TimestampSchema.optional(),
      })
      .optional(),
    /** Trust tier assigned by the host at install time. */
    trust: z.enum(['first-party', 'verified', 'community', 'untrusted']).optional(),

    /** Safety posture ---------------------------------------------------- */
    safety: z
      .strictObject({
        /** Everything this plugin can possibly do; superset of tool classes. */
        activityClasses: z.array(ActivityClassSchema).max(16).optional(),
        /** Plugin must never run outside `dry-run`/`advisory` autonomy. */
        advisoryOnly: z.boolean().optional(),
        /** Host must obtain approval before activating this plugin. */
        requiresApprovalOnActivate: z.boolean().optional(),
        /** Known destructive behaviour a reviewer must acknowledge. */
        destructiveOperations: z.array(LabelSchema.max(200)).max(32).optional(),
      })
      .optional(),

    deprecated: z.boolean().optional(),
    metadata: JsonObjectSchema.optional(),
    extensions: ExtensionsSchema.optional(),
  })
  .meta({
    id: 'PluginManifest',
    title: 'Plugin manifest',
    description:
      'Declarative description of a plugin: what it contributes, how it runs, and exactly which capabilities it may use.',
  });
export type PluginManifest = z.infer<typeof PluginManifestSchema>;

/** Installed-plugin record kept by the host (manifest + install-time state). */
export const InstalledPluginSchema = z
  .strictObject({
    id: PluginIdSchema,
    manifest: PluginManifestSchema,
    installedAt: TimestampSchema,
    installedFrom: z.string().max(2_048).optional(),
    enabled: z.boolean(),
    /** Permissions actually granted; a subset of what the manifest requested. */
    grantedPermissions: PluginPermissionsSchema.optional(),
    config: JsonObjectSchema.optional(),
    state: z.enum(['installed', 'activating', 'active', 'inactive', 'failed', 'quarantined']),
    lastError: LabelSchema.max(2_000).optional(),
    extensions: ExtensionsSchema.optional(),
  })
  .meta({ id: 'InstalledPlugin', title: 'Installed plugin' });
export type InstalledPlugin = z.infer<typeof InstalledPluginSchema>;
