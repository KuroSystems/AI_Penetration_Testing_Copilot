import { z } from 'zod';
import { ExtensionsSchema } from '../common/json.js';
import { ActorIdSchema, EngineNameSchema, PluginIdSchema } from '../common/ids.js';
import { LabelSchema, TimestampSchema } from '../common/primitives.js';

/**
 * Who (or what) caused something to happen.
 *
 * Every mutating operation in the system carries an `Actor`, because the audit
 * log must be able to answer "a human authorised this" vs "the planner decided
 * this on its own" without heuristics.
 */
export const ActorKindSchema = z.enum([
  'human', // an operator sitting in front of the UI/CLI
  'engine', // an in-process engine acting autonomously
  'model', // an LLM-generated decision (always attributed to its caller too)
  'plugin', // third-party code
  'system', // scheduler, migration, bootstrap
  'external', // an integration/webhook outside the copilot
]);
export type ActorKind = z.infer<typeof ActorKindSchema>;

/** Coarse role, used by the policy engine for authorisation decisions. */
export const ActorRoleSchema = z.enum([
  'owner',
  'lead-tester',
  'tester',
  'reviewer',
  'observer',
  'automation',
]);
export type ActorRole = z.infer<typeof ActorRoleSchema>;

export const ActorSchema = z
  .strictObject({
    id: ActorIdSchema,
    kind: ActorKindSchema,
    /** Human-readable name; for engines, the engine role name. */
    displayName: LabelSchema,
    roles: z.array(ActorRoleSchema).max(8).optional(),
    /** Set when `kind === 'engine'`. */
    engine: EngineNameSchema.optional(),
    /** Set when `kind === 'plugin'`. */
    pluginId: PluginIdSchema.optional(),
    /** Set when `kind === 'model'`: `provider/model`, e.g. `ollama/llama3.1:8b`. */
    modelRef: z.string().max(200).optional(),
    /** Local account or OIDC subject for humans. Never a credential. */
    subject: z.string().max(256).optional(),
    email: z.email().optional(),
    /**
     * When an actor acts *for* someone else (engine acting under a human's
     * authorisation), the delegation chain is recorded here, nearest first.
     */
    onBehalfOf: z.array(ActorIdSchema).max(8).optional(),
    authenticatedAt: TimestampSchema.optional(),
    extensions: ExtensionsSchema.optional(),
  })
  .meta({
    id: 'Actor',
    title: 'Actor',
    description: 'A human, engine, model, plugin or system principal that can cause changes.',
  });
export type Actor = z.infer<typeof ActorSchema>;

/** Compact actor reference embedded in high-volume records (events, audit). */
export const ActorRefSchema = z
  .strictObject({
    id: ActorIdSchema,
    kind: ActorKindSchema,
    displayName: LabelSchema.optional(),
  })
  .meta({ id: 'ActorRef', title: 'Actor reference' });
export type ActorRef = z.infer<typeof ActorRefSchema>;
