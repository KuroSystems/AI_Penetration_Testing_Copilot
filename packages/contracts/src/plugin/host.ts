import type { JsonObject, JsonValue } from '../common/json.js';
import type { Result } from '../common/errors.js';
import type { Page, PageRequest } from '../common/pagination.js';
import type { PluginId, PluginInstanceId, SessionId, ToolCallId } from '../common/ids.js';
import type { InstalledPlugin, PluginManifest, ToolDefinition } from './manifest.js';
import type { Clock, EngineClient, Logger } from '../messaging/engine.js';
import type { EventSubscriber } from '../messaging/event-bus.js';

/**
 * Plugin runtime contracts
 * ========================
 * The host owns the lifecycle; the plugin only implements `activate`.
 * Everything a plugin can reach arrives through `PluginContext`, which the host
 * builds from the *granted* permissions — a plugin literally cannot call what
 * it was not granted, so enforcement is structural rather than advisory
 * (ADR-0008).
 */

/** Handle a tool implementation receives per invocation. */
export interface ToolInvocationContext {
  readonly toolCallId: ToolCallId;
  readonly sessionId?: SessionId;
  /** Cancels on timeout, session abort, budget exhaustion or host shutdown. */
  readonly signal: AbortSignal;
  readonly logger: Logger;
  /** Emits incremental output (stdout lines, progress) to the caller. */
  progress(chunk: JsonValue): void;
  /** True when the session runs in `dry-run`: perform no side effects. */
  readonly dryRun: boolean;
  /** Ask the host whether a specific target is in scope before touching it. */
  isInScope(target: string): Promise<boolean>;
}

export type ToolHandler = (
  args: JsonObject,
  context: ToolInvocationContext,
) => Promise<Result<JsonValue>>;

/** Everything the host exposes to a plugin instance. */
export interface PluginContext {
  readonly pluginId: PluginId;
  readonly instanceId: PluginInstanceId;
  readonly manifest: PluginManifest;
  /** Effective, validated configuration for this instance. */
  readonly config: Readonly<JsonObject>;
  readonly logger: Logger;
  readonly clock: Clock;
  /** Cancels when the plugin is being deactivated. */
  readonly signal: AbortSignal;
  /** Subscribe-only bus access, filtered to granted patterns. */
  readonly events: EventSubscriber;
  /** Engine calls, filtered to granted operation names. */
  readonly calls: EngineClient;
  /** Private, plugin-scoped key-value state. */
  readonly state: PluginStateStore;
  /** Registers a tool implementation for a tool declared in the manifest. */
  registerTool(name: string, handler: ToolHandler): void;
  /** Registers a prompt module shipped by the plugin. */
  registerPromptModule(module: JsonObject): void;
  /** Emits a host-mediated event (the host stamps source/permissions). */
  emit(name: string, payload: JsonObject): Promise<Result<void>>;
}

export interface PluginStateStore {
  get<T extends JsonValue = JsonValue>(key: string): Promise<T | undefined>;
  set(key: string, value: JsonValue): Promise<Result<void>>;
  delete(key: string): Promise<Result<void>>;
  keys(prefix?: string): Promise<string[]>;
}

/** What a plugin module must export. */
export interface PluginModule {
  activate(context: PluginContext): Promise<Result<void>> | Result<void>;
  deactivate?(reason: string): Promise<void> | void;
  /** Optional readiness probe used by `restart: on-failure`. */
  health?(): Promise<{ ok: boolean; detail?: string }>;
}

/** Host-side management surface (implemented by the plugin-host engine). */
export interface PluginHost {
  install(source: string, options?: { grant?: unknown; trust?: string }): Promise<Result<InstalledPlugin>>;
  uninstall(pluginId: PluginId): Promise<Result<void>>;
  enable(pluginId: PluginId): Promise<Result<void>>;
  disable(pluginId: PluginId, reason?: string): Promise<Result<void>>;
  activate(pluginId: PluginId, sessionId?: SessionId): Promise<Result<PluginInstanceId>>;
  deactivate(instanceId: PluginInstanceId, reason?: string): Promise<Result<void>>;
  list(page?: PageRequest): Promise<Result<Page<InstalledPlugin>>>;
  get(pluginId: PluginId): Promise<Result<InstalledPlugin>>;
  /** Validates a manifest without installing; used by CI and the CLI. */
  validateManifest(manifest: unknown): Result<PluginManifest>;
  /** All tools currently available, namespaced `<plugin>.<tool>`. */
  listTools(sessionId?: SessionId): Promise<Result<ToolDefinition[]>>;
  invokeTool(
    name: string,
    args: JsonObject,
    options?: { sessionId?: SessionId; timeoutMs?: number; signal?: AbortSignal; dryRun?: boolean },
  ): Promise<Result<JsonValue>>;
}
