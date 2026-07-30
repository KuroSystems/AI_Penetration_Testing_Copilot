import { z } from 'zod';

/**
 * Any JSON-serialisable value.
 *
 * Every value that crosses an engine boundary (event bus payload, repository
 * record, plugin call argument, model tool argument) MUST be representable as
 * `JsonValue`. This is the base assumption that lets us persist, replay, hash
 * and redact anything that moves through the system.
 */
export const JsonValueSchema = z.json().meta({
  id: 'JsonValue',
  title: 'JSON value',
  description: 'Any JSON-serialisable value.',
});
export type JsonValue = z.infer<typeof JsonValueSchema>;

/** A JSON object (the shape of most payload/metadata bags). */
export const JsonObjectSchema = z.record(z.string(), JsonValueSchema);
export type JsonObject = Record<string, JsonValue>;

/**
 * Forward-compatibility escape hatch.
 *
 * All top-level contract objects are *closed* (`additionalProperties: false`)
 * so that typos are caught early. Anything a producer wants to add that the
 * contract does not model yet goes into `extensions`, keyed by a reverse-DNS
 * or `vendor:name` style key. Consumers MUST ignore extension keys they do not
 * understand and MUST NOT let an unknown extension fail a payload.
 *
 * @see docs/adr/0010-schema-versioning-and-compatibility.md
 */
export const ExtensionsSchema = z
  .record(z.string().regex(/^[a-z0-9]([a-z0-9._:-]{0,62}[a-z0-9])?$/), JsonValueSchema)
  .describe('Namespaced, non-contractual extension data. Unknown keys MUST be ignored.');
export type Extensions = z.infer<typeof ExtensionsSchema>;
