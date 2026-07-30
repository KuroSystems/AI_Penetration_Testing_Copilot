/**
 * @aiptc/contracts
 * ================
 * Phase 0 foundation: the schemas, types and interfaces every engine in the
 * AI Penetration Testing Copilot must honour.
 *
 * This package contains **no engine logic** — no orchestration, no prompt
 * rendering, no provider calls, no storage implementation. It only defines the
 * shapes those engines exchange, plus tiny, pure helpers for building and
 * validating them.
 *
 * See `docs/adr/` for the reasoning behind each decision.
 */

/* Common ------------------------------------------------------------------ */
export * from './common/json.js';
export * from './common/primitives.js';
export * from './common/ids.js';
export * from './common/errors.js';
export * from './common/pagination.js';

/* Domain ------------------------------------------------------------------ */
export * from './domain/actor.js';
export * from './domain/target.js';
export * from './domain/artifact.js';
export * from './domain/finding.js';

/* Session ----------------------------------------------------------------- */
export * from './session/session.js';

/* Prompt ------------------------------------------------------------------ */
export * from './prompt/prompt-module.js';

/* Messaging --------------------------------------------------------------- */
export * from './messaging/envelope.js';
export * from './messaging/events.js';
export * from './messaging/event-bus.js';
export * from './messaging/engine.js';

/* Plugin ------------------------------------------------------------------ */
export * from './plugin/manifest.js';
export * from './plugin/host.js';

/* Model ------------------------------------------------------------------- */
export * from './model/provider.js';

/* Storage ----------------------------------------------------------------- */
export * from './storage/repository.js';

/* Audit & telemetry ------------------------------------------------------- */
export * from './audit/audit.js';

/* Registry ---------------------------------------------------------------- */
export * from './registry.js';
