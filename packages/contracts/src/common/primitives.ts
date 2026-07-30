import { z } from 'zod';

/* -------------------------------------------------------------------------- */
/* Time                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * RFC 3339 / ISO 8601 timestamp with an explicit offset (`Z` preferred).
 * Naive local timestamps are forbidden: audit trails must be comparable
 * across machines and replays.
 */
export const TimestampSchema = z.iso
  .datetime({ offset: true })
  .describe('RFC 3339 timestamp with explicit UTC offset, e.g. 2026-07-30T10:15:00.000Z');
export type Timestamp = z.infer<typeof TimestampSchema>;

/** Whole milliseconds. Used for durations, timeouts and budgets. */
export const DurationMsSchema = z.int().min(0).max(2_147_483_647).describe('Duration in milliseconds');
export type DurationMs = z.infer<typeof DurationMsSchema>;

/** IANA timezone name, e.g. `Asia/Kolkata`. Presentation concern only. */
export const TimezoneSchema = z
  .string()
  .regex(/^[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+){0,2}$/)
  .max(64)
  .describe('IANA timezone identifier');
export type Timezone = z.infer<typeof TimezoneSchema>;

/* -------------------------------------------------------------------------- */
/* Versioning                                                                  */
/* -------------------------------------------------------------------------- */

const SEMVER_RE =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

/** Exact semantic version, e.g. `1.4.2`, `2.0.0-rc.1`. */
export const SemVerSchema = z.string().regex(SEMVER_RE).describe('Semantic version (semver 2.0.0)');
export type SemVer = z.infer<typeof SemVerSchema>;

/** npm-style semver range, e.g. `^1.2.0`, `>=1.0.0 <2.0.0`. */
export const SemVerRangeSchema = z
  .string()
  .min(1)
  .max(128)
  .describe('Semver range expression, e.g. "^1.2.0"');
export type SemVerRange = z.infer<typeof SemVerRangeSchema>;

/**
 * Contract schema version carried by every top-level object.
 * Major bump = breaking change; consumers MUST reject unknown majors.
 */
export const SchemaVersionSchema = SemVerSchema.describe(
  'Version of the contract schema this document conforms to',
);
export type SchemaVersion = z.infer<typeof SchemaVersionSchema>;

/* -------------------------------------------------------------------------- */
/* Text primitives                                                             */
/* -------------------------------------------------------------------------- */

/** Lowercase kebab/dot slug used for machine-facing names. */
export const SlugSchema = z
  .string()
  .min(1)
  .max(96)
  .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/)
  .describe('Lowercase machine name, e.g. "recon.port-scan"');
export type Slug = z.infer<typeof SlugSchema>;

/** Human-facing short label. */
export const LabelSchema = z.string().min(1).max(200).describe('Short human-readable label');
export type Label = z.infer<typeof LabelSchema>;

/** Free-form human description (markdown allowed). */
export const DescriptionSchema = z.string().max(8_000).describe('Human-readable description (markdown allowed)');
export type Description = z.infer<typeof DescriptionSchema>;

/** Arbitrary short tag for grouping/filtering. */
export const TagSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9._:\/-]*$/)
  .describe('Free-form tag');
export type Tag = z.infer<typeof TagSchema>;

export const TagsSchema = z.array(TagSchema).max(64);

/** Absolute URI. */
export const UriSchema = z.url().max(2_048).describe('Absolute URI');
export type Uri = z.infer<typeof UriSchema>;

/** Lowercase hex SHA-256 digest. */
export const Sha256Schema = z
  .string()
  .regex(/^[a-f0-9]{64}$/)
  .describe('Lowercase hex SHA-256 digest');
export type Sha256 = z.infer<typeof Sha256Schema>;

/** Multihash-style content digest, e.g. `sha256:ab12…`. */
export const ContentDigestSchema = z
  .string()
  .regex(/^(sha256|sha512|blake3):[a-f0-9]{32,128}$/)
  .describe('Algorithm-prefixed content digest, e.g. "sha256:<hex>"');
export type ContentDigest = z.infer<typeof ContentDigestSchema>;

/** RFC 6838 media type. */
export const MediaTypeSchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9!#$&^_.+-]{0,126}\/[a-z0-9][a-z0-9!#$&^_.+-]{0,126}(;\s?.+)?$/i)
  .describe('IANA media type, e.g. "application/json"');
export type MediaType = z.infer<typeof MediaTypeSchema>;

/** BCP-47 language tag. */
export const LanguageTagSchema = z
  .string()
  .regex(/^[a-zA-Z]{2,3}(-[a-zA-Z]{4})?(-([a-zA-Z]{2}|[0-9]{3}))?$/)
  .describe('BCP-47 language tag, e.g. "en" or "en-GB"');

/* -------------------------------------------------------------------------- */
/* Numeric helpers                                                             */
/* -------------------------------------------------------------------------- */

/** Confidence / probability in the closed interval [0, 1]. */
export const UnitIntervalSchema = z.number().min(0).max(1).describe('Value in the closed interval [0, 1]');
export type UnitInterval = z.infer<typeof UnitIntervalSchema>;

/** Non-negative integer count. */
export const CountSchema = z.int().min(0);

/** ISO-4217 currency code. */
export const CurrencyCodeSchema = z.string().regex(/^[A-Z]{3}$/).describe('ISO-4217 currency code');

/** Money amount expressed in minor units to avoid float drift. */
export const MoneySchema = z.strictObject({
  currency: CurrencyCodeSchema,
  /** Amount in minor units (e.g. cents). */
  minorUnits: z.int(),
});
export type Money = z.infer<typeof MoneySchema>;

/* -------------------------------------------------------------------------- */
/* Sensitivity / handling                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Traffic-light-protocol style handling class. Drives redaction in the audit
 * log, export gates in reporting and what may be sent to a remote model.
 */
export const SensitivitySchema = z
  .enum(['public', 'internal', 'confidential', 'restricted', 'secret'])
  .describe('Handling classification; drives redaction and egress policy');
export type Sensitivity = z.infer<typeof SensitivitySchema>;

/** How a value must be treated when serialised into logs or reports. */
export const RedactionModeSchema = z.enum(['none', 'mask', 'hash', 'drop', 'tokenize']);
export type RedactionMode = z.infer<typeof RedactionModeSchema>;

/**
 * Marks a JSON pointer inside a payload as sensitive, with the redaction
 * strategy the audit/telemetry sinks must apply.
 */
export const RedactionRuleSchema = z.strictObject({
  /** RFC 6901 JSON Pointer into the payload, e.g. `/credentials/password`. */
  pointer: z.string().regex(/^(\/(([^/~])|(~[01]))*)*$/),
  mode: RedactionModeSchema,
  reason: DescriptionSchema.optional(),
});
export type RedactionRule = z.infer<typeof RedactionRuleSchema>;

/* -------------------------------------------------------------------------- */
/* Networking primitives (shared by scope, findings and evidence)              */
/* -------------------------------------------------------------------------- */

export const HostnameSchema = z
  .string()
  .min(1)
  .max(253)
  .regex(/^(\*\.)?([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z]{2,63}\.?$/)
  .describe('DNS hostname, optionally wildcarded');

export const IpAddressSchema = z.union([z.ipv4(), z.ipv6()]).describe('IPv4 or IPv6 address');

export const CidrSchema = z.union([z.cidrv4(), z.cidrv6()]).describe('IPv4 or IPv6 CIDR block');

export const PortSchema = z.int().min(0).max(65_535);

export const PortRangeSchema = z.strictObject({
  from: PortSchema,
  to: PortSchema,
});

export const TransportProtocolSchema = z.enum(['tcp', 'udp', 'icmp', 'sctp', 'any']);
