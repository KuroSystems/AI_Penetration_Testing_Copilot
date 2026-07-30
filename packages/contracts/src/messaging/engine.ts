import type { z } from 'zod';
import type { EngineName, Address, CorrelationId } from '../common/ids.js';
import type { ContractError, Result } from '../common/errors.js';
import type {
  MessageName,
  RequestEnvelope,
  ResponseEnvelope,
  StreamChunkEnvelope,
} from './envelope.js';
import type { EventPublisher, EventSubscriber } from './event-bus.js';

/**
 * Direct calls (request/response)
 * ===============================
 * Work is requested through *typed, direct* calls — not through the bus.
 * The caller gets a value or an error back, the stack trace stays intact, and
 * back-pressure is natural (ADR-0003).
 *
 * An engine therefore exposes two surfaces:
 *  - a set of **operations** (`EngineOperation`) other engines may call;
 *  - a set of **event subscriptions** it installs on the bus.
 *
 * Nothing here knows what any specific engine does: Phase 0 fixes the shape of
 * the contract, later phases register concrete operations against it.
 */

/** Declarative description of one callable operation. */
export interface EngineOperation<Req = unknown, Res = unknown> {
  /** Dotted name, matching `MessageNameSchema`, e.g. `model.completion.create`. */
  readonly name: MessageName;
  readonly summary: string;
  /** Runtime schema for the request payload. */
  readonly request: z.ZodType<Req>;
  /** Runtime schema for the response payload. */
  readonly response: z.ZodType<Res>;
  /** True when the operation may be retried safely with the same payload. */
  readonly idempotent?: boolean;
  /** True when the operation supports streaming partial results. */
  readonly streaming?: boolean;
  /** Default caller deadline; callers may shorten but not extend it. */
  readonly defaultTimeoutMs?: number;
}

/** Context handed to an operation handler. */
export interface EngineCallContext {
  readonly correlationId: CorrelationId;
  readonly caller: Address;
  readonly sessionId?: string;
  /** Cancels on caller timeout, session abort or host shutdown. */
  readonly signal: AbortSignal;
  /** Absolute deadline in epoch milliseconds, when the caller set one. */
  readonly deadlineAt?: number;
  /** The full inbound envelope, for engines that need headers. */
  readonly envelope: RequestEnvelope;
  /** Emits progress chunks; only available for streaming operations. */
  readonly emit?: (chunk: Omit<StreamChunkEnvelope, keyof RequestEnvelope | 'kind'> | unknown) => void;
}

export type EngineHandler<Req = unknown, Res = unknown> = (
  request: Req,
  context: EngineCallContext,
) => Promise<Result<Res>>;

/**
 * The uniform surface every engine implements. Registration, lifecycle and
 * health are common; the actual capability set is data (`operations`).
 */
export interface Engine {
  readonly name: EngineName;
  readonly version: string;
  /** Operations this engine serves. */
  readonly operations: readonly EngineOperation[];
  /** Called once, before any traffic. */
  start(context: EngineRuntimeContext): Promise<Result<void>>;
  /** Drains in-flight work and releases resources. */
  stop(reason?: string): Promise<Result<void>>;
  /** Cheap liveness/readiness probe. */
  health(): Promise<EngineHealth>;
  /** Dispatches an inbound request to the matching handler. */
  handle(request: RequestEnvelope, context: EngineCallContext): Promise<ResponseEnvelope>;
}

export interface EngineHealth {
  readonly status: 'starting' | 'healthy' | 'degraded' | 'unhealthy' | 'stopped';
  readonly detail?: string;
  readonly checkedAt: string;
  readonly metrics?: Record<string, number>;
}

/**
 * Everything an engine is allowed to reach at runtime. Handing this in (rather
 * than importing singletons) keeps engines testable and keeps the dependency
 * graph explicit.
 */
export interface EngineRuntimeContext {
  /** Typed client for calling other engines. */
  readonly calls: EngineClient;
  /** Publish-only bus handle, pre-bound to this engine's address. */
  readonly events: EventPublisher;
  /** Subscribe-only bus handle. */
  readonly subscriptions: EventSubscriber;
  /** Structured logger; log records are mirrored to telemetry, not to audit. */
  readonly logger: Logger;
  /** Monotonic + wall clocks, injected for deterministic replay in tests. */
  readonly clock: Clock;
  /** Cancels when the host shuts down. */
  readonly signal: AbortSignal;
  /** Read-only configuration snapshot for this engine. */
  readonly config: Readonly<Record<string, unknown>>;
}

/** Typed client used for engine→engine request/response. */
export interface EngineClient {
  call<Req, Res>(
    target: EngineName | Address,
    operation: EngineOperation<Req, Res>,
    request: Req,
    options?: EngineCallOptions,
  ): Promise<Result<Res>>;

  /** Streaming variant; yields chunks until the terminal response. */
  stream<Req, Res>(
    target: EngineName | Address,
    operation: EngineOperation<Req, Res>,
    request: Req,
    options?: EngineCallOptions,
  ): AsyncIterable<Result<Res>>;
}

export interface EngineCallOptions {
  readonly timeoutMs?: number;
  readonly correlationId?: CorrelationId;
  readonly causationId?: string;
  readonly sessionId?: string;
  readonly idempotencyKey?: string;
  readonly signal?: AbortSignal;
  readonly priority?: 'low' | 'normal' | 'high' | 'critical';
}

export interface Logger {
  trace(message: string, fields?: Record<string, unknown>): void;
  debug(message: string, fields?: Record<string, unknown>): void;
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
  /** Returns a logger with permanently bound fields. */
  child(fields: Record<string, unknown>): Logger;
}

export interface Clock {
  /** Wall-clock ISO-8601 timestamp. */
  now(): string;
  /** Epoch milliseconds. */
  epochMs(): number;
  /** Monotonic milliseconds, for durations. */
  monotonicMs(): number;
}

/** Error helper contract: engines must map thrown values to `ContractError`. */
export type ErrorMapper = (error: unknown, source: string) => ContractError;
