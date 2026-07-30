import { z } from 'zod';
import { JsonObjectSchema } from './json.js';
import { DescriptionSchema, DurationMsSchema, LabelSchema, TimestampSchema } from './primitives.js';
import { AnyIdSchema } from './ids.js';

/**
 * A single, canonical error shape for *every* boundary: engine→engine replies,
 * plugin calls, model provider failures and repository operations.
 *
 * Design notes (ADR-0007):
 *  - `code` is a stable, machine-readable enum. New codes are additive.
 *  - `retryable` + `retryAfterMs` let callers implement uniform backoff without
 *    string-matching messages.
 *  - `cause` is recursive so a gateway can wrap a provider error without losing
 *    the original.
 */
export const ErrorCodeSchema = z.enum([
  // Client-side / contract
  'invalid_request',
  'schema_validation_failed',
  'unsupported_version',
  'not_found',
  'already_exists',
  'conflict',
  'precondition_failed',
  'unsupported_operation',
  // Authorisation & safety
  'unauthorized',
  'forbidden',
  'out_of_scope',
  'policy_violation',
  'approval_required',
  'safety_refusal',
  // Resource / runtime
  'rate_limited',
  'quota_exceeded',
  'budget_exceeded',
  'timeout',
  'cancelled',
  'unavailable',
  'dependency_failed',
  'transport_error',
  // Model specific
  'model_context_length_exceeded',
  'model_content_filtered',
  'model_output_invalid',
  // Storage specific
  'storage_conflict',
  'storage_unavailable',
  'transaction_aborted',
  // Plugin specific
  'plugin_load_failed',
  'plugin_incompatible',
  'plugin_crashed',
  'sandbox_violation',
  // Fallback
  'internal_error',
  'unknown',
]);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

/** Field-level detail for validation failures. */
export const FieldErrorSchema = z.strictObject({
  /** RFC 6901 JSON Pointer to the offending value. */
  pointer: z.string(),
  message: z.string().max(1_000),
  code: z.string().max(64).optional(),
  expected: z.string().max(500).optional(),
  received: z.string().max(500).optional(),
});
export type FieldError = z.infer<typeof FieldErrorSchema>;

export interface ContractError {
  code: ErrorCode;
  message: string;
  /** Provider/plugin-specific code, preserved verbatim for debugging. */
  vendorCode?: string;
  retryable?: boolean;
  retryAfterMs?: number;
  /** Where the error was raised (engine name, plugin id, provider id, …). */
  source?: string;
  /** Correlation/message id that failed, if any. */
  reference?: string;
  occurredAt?: string;
  details?: FieldError[];
  data?: Record<string, unknown>;
  /** Operator-facing hint: what to do next. */
  remediation?: string;
  cause?: ContractError;
}

export const ContractErrorSchema: z.ZodType<ContractError> = z.lazy(() =>
  z.strictObject({
    code: ErrorCodeSchema,
    message: LabelSchema.max(2_000),
    vendorCode: z.string().max(128).optional(),
    retryable: z.boolean().optional(),
    retryAfterMs: DurationMsSchema.optional(),
    source: z.string().max(128).optional(),
    reference: AnyIdSchema.optional(),
    occurredAt: TimestampSchema.optional(),
    details: z.array(FieldErrorSchema).max(200).optional(),
    data: JsonObjectSchema.optional(),
    remediation: DescriptionSchema.optional(),
    cause: ContractErrorSchema.optional(),
  }),
).meta({
  id: 'ContractError',
  title: 'Contract error',
  description: 'Canonical error shape returned at every engine, plugin, model and storage boundary.',
});

/**
 * Discriminated result used by every interface that can fail without throwing.
 * Engines SHOULD return `Result` across process/plugin boundaries and reserve
 * exceptions for programmer errors.
 */
export type Ok<T> = { ok: true; value: T };
export type Err<E = ContractError> = { ok: false; error: E };
export type Result<T, E = ContractError> = Ok<T> | Err<E>;

export const okResult = <T>(value: T): Ok<T> => ({ ok: true, value });
export const errResult = <E = ContractError>(error: E): Err<E> => ({ ok: false, error });

/** Builds a `Result` schema for a given value schema. */
export const resultSchema = <T extends z.ZodType>(value: T) =>
  z.discriminatedUnion('ok', [
    z.strictObject({ ok: z.literal(true), value }),
    z.strictObject({ ok: z.literal(false), error: ContractErrorSchema }),
  ]);
