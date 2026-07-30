import type { EventEnvelope, TopicPattern, TypedEvent } from './envelope.js';
import type { EventName } from './events.js';
import type { ContractError, Result } from '../common/errors.js';
import type { Address, SubscriptionId } from '../common/ids.js';

/**
 * In-process event bus
 * ====================
 * The bus carries *facts* to interested parties. It never carries work
 * requests, and publishers never learn who consumed an event (ADR-0003).
 *
 * Guarantees the reference implementation must provide:
 *  1. **Ordering** — per `subject`, events are delivered to a given subscriber
 *     in publish order. No global ordering guarantee across subjects.
 *  2. **Isolation** — a throwing subscriber never affects the publisher or
 *     other subscribers; the error is routed to `onSubscriberError`.
 *  3. **Async by default** — handlers run on a microtask after the publisher's
 *     current turn, so publishing cannot re-enter the publisher's own state.
 *  4. **No back-pressure onto publishers** — `publish` resolves once the event
 *     is accepted for delivery, not once handlers finish. Use `publishAndWait`
 *     when a caller genuinely needs completion (tests, shutdown flushes).
 *  5. **At-most-once in memory** — durability is the audit engine's job, not
 *     the bus's. An event that must survive a crash is written by an audit
 *     subscriber to the repository.
 */

export interface SubscriptionOptions {
  /** Human-readable name; shows up in telemetry and error messages. */
  readonly name?: string;
  /** Address of the subscribing engine, for diagnostics and loop detection. */
  readonly subscriber?: Address;
  /** Deliver at most once, then auto-unsubscribe. */
  readonly once?: boolean;
  /** Only deliver events whose `subject` matches exactly. */
  readonly subject?: string;
  /** Only deliver events published for this session. */
  readonly sessionId?: string;
  /** Arbitrary predicate applied after pattern matching. */
  readonly filter?: (event: EventEnvelope) => boolean;
  /** Lower numbers run earlier. Handlers still run concurrently by default. */
  readonly priority?: number;
  /** Abort delivery of a single handler after this many milliseconds. */
  readonly handlerTimeoutMs?: number;
  /** Signal that unsubscribes when aborted. */
  readonly signal?: AbortSignal;
}

export interface EventHandlerContext {
  readonly subscriptionId: SubscriptionId;
  /** Cancels when the bus is shutting down or the subscription is aborted. */
  readonly signal: AbortSignal;
  /** Delivery attempt, starting at 1. */
  readonly attempt: number;
}

export type EventHandler<P = unknown> = (
  event: TypedEvent<P>,
  context: EventHandlerContext,
) => void | Promise<void>;

export interface Subscription {
  readonly id: SubscriptionId;
  readonly pattern: TopicPattern;
  unsubscribe(): void;
}

export interface PublishOptions {
  /** Skip delivery to the publisher's own subscriptions. */
  readonly excludeSelf?: boolean;
  /** Deliver synchronously within the caller's turn. Use sparingly. */
  readonly synchronous?: boolean;
}

/** Reported when a subscriber throws; never propagated to the publisher. */
export interface SubscriberFailure {
  readonly subscriptionId: SubscriptionId;
  readonly event: EventEnvelope;
  readonly error: ContractError;
}

export interface EventBus {
  /**
   * Publishes a fact. Resolves once the event has been accepted for delivery.
   * Returns the number of subscriptions the event was routed to.
   */
  publish(event: EventEnvelope, options?: PublishOptions): Promise<Result<{ delivered: number }>>;

  /** Publishes and resolves only after every handler has settled. */
  publishAndWait(event: EventEnvelope, options?: PublishOptions): Promise<Result<{ delivered: number; failures: SubscriberFailure[] }>>;

  /** Subscribes to a topic pattern (`session.*`, `audit.**`, exact name, …). */
  subscribe<P = unknown>(
    pattern: TopicPattern | EventName,
    handler: EventHandler<P>,
    options?: SubscriptionOptions,
  ): Subscription;

  /** Resolves with the next matching event, or rejects on timeout/abort. */
  once<P = unknown>(
    pattern: TopicPattern | EventName,
    options?: SubscriptionOptions & { timeoutMs?: number },
  ): Promise<TypedEvent<P>>;

  /** Registers a sink for subscriber failures (used by the audit engine). */
  onSubscriberError(handler: (failure: SubscriberFailure) => void): Subscription;

  /** Awaits completion of all in-flight deliveries. */
  drain(timeoutMs?: number): Promise<void>;

  /** Rejects new publishes, drains, then releases resources. */
  close(): Promise<void>;
}

/**
 * Read-only projection of the bus handed to plugins and to engines that must
 * not be able to forge events from other sources.
 */
export interface EventSubscriber {
  subscribe<P = unknown>(
    pattern: TopicPattern | EventName,
    handler: EventHandler<P>,
    options?: SubscriptionOptions,
  ): Subscription;
}

/** Publish-only projection, scoped to a fixed `source` address. */
export interface EventPublisher {
  readonly source: Address;
  publish(event: EventEnvelope, options?: PublishOptions): Promise<Result<{ delivered: number }>>;
}
