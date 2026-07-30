import { z } from 'zod';
import type { JsonValue } from '../common/json.js';
import type { Result } from '../common/errors.js';
import type { Page, PageRequest } from '../common/pagination.js';
import type { Artifact } from '../domain/artifact.js';
import type { Evidence, Finding } from '../domain/finding.js';
import type { Session, SessionStep, ApprovalRequest } from '../session/session.js';
import type { PromptModule } from '../prompt/prompt-module.js';
import type { InstalledPlugin } from '../plugin/manifest.js';
import type { AuthorizationRecord, EngagementScope } from '../domain/target.js';
import type { AuditRecord } from '../audit/audit.js';

/**
 * Storage abstraction (repository pattern)
 * ========================================
 * Engines never see SQL, file paths or a driver. They see `Repository<T>`,
 * `BlobStore` and `KeyValueStore`. The first implementation is SQLite + local
 * files; swapping it for another *local* store must not touch a single engine
 * (ADR-0004).
 *
 * Rules baked into these types:
 *  - **Ids are assigned by the caller**, not the store, so an entity can be
 *    referenced before it is persisted and so replay is deterministic.
 *  - **Optimistic concurrency via `revision`**: `save` takes `expectedRevision`
 *    and fails with `storage_conflict` on mismatch. No lost updates, no locks.
 *  - **Queries are declarative data**, never callbacks, so any backend can
 *    translate them.
 *  - **No lazy loading / no proxies.** What you asked for is what you get.
 */

/* -------------------------------------------------------------------------- */
/* Query language                                                              */
/* -------------------------------------------------------------------------- */

export const FilterOperatorSchema = z.enum([
  'eq',
  'ne',
  'lt',
  'lte',
  'gt',
  'gte',
  'in',
  'nin',
  'contains',
  'starts-with',
  'ends-with',
  'exists',
  'between',
]);
export type FilterOperator = z.infer<typeof FilterOperatorSchema>;

export const FilterConditionSchema = z.strictObject({
  /** Dotted field path within the entity, e.g. `scope.rules.0.effect`. */
  field: z.string().min(1).max(200),
  op: FilterOperatorSchema,
  value: z.unknown().optional(),
});
export type FilterCondition = z.infer<typeof FilterConditionSchema>;

export interface QuerySpec {
  /** All conditions must match (AND). */
  readonly where?: FilterCondition[];
  /** At least one group must match; each group is an AND of its conditions. */
  readonly any?: FilterCondition[][];
  readonly sort?: { field: string; direction: 'asc' | 'desc' }[];
  readonly page?: PageRequest;
  /** Projection: return only these fields (backends may ignore). */
  readonly select?: string[];
}

/* -------------------------------------------------------------------------- */
/* Repository                                                                  */
/* -------------------------------------------------------------------------- */

/** Options accepted by mutating operations. */
export interface WriteOptions {
  /** Optimistic concurrency guard; `0` asserts "must not exist yet". */
  readonly expectedRevision?: number;
  /** Participate in an open transaction. */
  readonly transaction?: TransactionHandle;
  /** Suppress `storage.entity.persisted` (bulk imports, migrations). */
  readonly silent?: boolean;
}

export interface ReadOptions {
  readonly transaction?: TransactionHandle;
  /** Include soft-deleted rows. */
  readonly includeDeleted?: boolean;
}

/** Envelope the store returns around an entity: payload + storage metadata. */
export interface Stored<T> {
  readonly entity: T;
  readonly revision: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt?: string;
}

/**
 * Generic persistence port. `T` must be a plain JSON-serialisable entity with
 * a string `id`; nothing else is assumed about it.
 */
export interface Repository<T extends { id: string }, ID extends string = string> {
  /** Logical collection name, e.g. `session`. */
  readonly collection: string;

  get(id: ID, options?: ReadOptions): Promise<Result<T | undefined>>;
  getStored(id: ID, options?: ReadOptions): Promise<Result<Stored<T> | undefined>>;
  getMany(ids: readonly ID[], options?: ReadOptions): Promise<Result<T[]>>;
  exists(id: ID, options?: ReadOptions): Promise<Result<boolean>>;

  /** Inserts; fails with `already_exists` when the id is taken. */
  create(entity: T, options?: WriteOptions): Promise<Result<Stored<T>>>;
  /** Replaces an existing entity; honours `expectedRevision`. */
  update(entity: T, options?: WriteOptions): Promise<Result<Stored<T>>>;
  /** Insert-or-replace. */
  upsert(entity: T, options?: WriteOptions): Promise<Result<Stored<T>>>;
  /** Shallow field patch, for hot paths like counters. */
  patch(id: ID, patch: Partial<T>, options?: WriteOptions): Promise<Result<Stored<T>>>;

  /** Soft delete by default; `hard: true` removes the row. */
  delete(id: ID, options?: WriteOptions & { hard?: boolean }): Promise<Result<void>>;

  find(query: QuerySpec, options?: ReadOptions): Promise<Result<Page<T>>>;
  findOne(query: QuerySpec, options?: ReadOptions): Promise<Result<T | undefined>>;
  count(query?: Pick<QuerySpec, 'where' | 'any'>, options?: ReadOptions): Promise<Result<number>>;
  /** Streams large result sets without materialising them. */
  iterate(query: QuerySpec, options?: ReadOptions): AsyncIterable<T>;
}

/** Append-only repository used by the audit log (no update, no delete). */
export interface AppendOnlyRepository<T extends { id: string }> {
  readonly collection: string;
  append(entity: T, options?: { transaction?: TransactionHandle }): Promise<Result<Stored<T>>>;
  get(id: string): Promise<Result<T | undefined>>;
  find(query: QuerySpec): Promise<Result<Page<T>>>;
  iterate(query: QuerySpec): AsyncIterable<T>;
  /** Verifies the tamper-evident hash chain over a range. */
  verifyChain(range?: { fromId?: string; toId?: string }): Promise<Result<{ valid: boolean; brokenAt?: string }>>;
}

/* -------------------------------------------------------------------------- */
/* Transactions                                                                */
/* -------------------------------------------------------------------------- */

export interface TransactionHandle {
  readonly id: string;
  readonly startedAt: string;
  readonly isolation: 'read-committed' | 'repeatable-read' | 'serializable';
}

export interface UnitOfWork {
  /**
   * Runs `fn` inside a transaction: commits on success, rolls back on a thrown
   * error or an `Err` result. Nested calls join the outer transaction.
   */
  withTransaction<T>(
    fn: (tx: TransactionHandle) => Promise<Result<T>>,
    options?: { isolation?: TransactionHandle['isolation']; timeoutMs?: number },
  ): Promise<Result<T>>;
}

/* -------------------------------------------------------------------------- */
/* Blobs & key-value                                                           */
/* -------------------------------------------------------------------------- */

export interface BlobMetadata {
  readonly uri: string;
  readonly sizeBytes: number;
  readonly mediaType: string;
  readonly digest: string;
  readonly createdAt: string;
}

/** Content-addressed byte storage backing `Artifact.content`. */
export interface BlobStore {
  put(
    data: Uint8Array | AsyncIterable<Uint8Array>,
    meta: { mediaType: string; filename?: string; sensitivity?: string },
  ): Promise<Result<BlobMetadata>>;
  get(uri: string): Promise<Result<Uint8Array>>;
  openRead(uri: string): Promise<Result<AsyncIterable<Uint8Array>>>;
  stat(uri: string): Promise<Result<BlobMetadata | undefined>>;
  delete(uri: string): Promise<Result<void>>;
  /** Recomputes the digest and compares it with the recorded one. */
  verify(uri: string): Promise<Result<boolean>>;
}

/** Small, non-relational state (cursors, caches, plugin state). */
export interface KeyValueStore {
  get<T extends JsonValue = JsonValue>(key: string): Promise<Result<T | undefined>>;
  set(key: string, value: JsonValue, options?: { ttlMs?: number }): Promise<Result<void>>;
  delete(key: string): Promise<Result<void>>;
  keys(prefix?: string): Promise<Result<string[]>>;
  /** Atomic compare-and-set; the primitive behind distributed-free locking. */
  compareAndSet(key: string, expected: JsonValue | undefined, next: JsonValue): Promise<Result<boolean>>;
}

/* -------------------------------------------------------------------------- */
/* Provider                                                                    */
/* -------------------------------------------------------------------------- */

/** Canonical collection names; the only strings engines may pass to `repository()`. */
export const COLLECTIONS = {
  session: 'session',
  sessionStep: 'session-step',
  approval: 'approval',
  engagementScope: 'engagement-scope',
  authorization: 'authorization',
  target: 'target',
  finding: 'finding',
  evidence: 'evidence',
  artifact: 'artifact',
  promptModule: 'prompt-module',
  plugin: 'plugin',
  audit: 'audit',
  telemetry: 'telemetry',
  report: 'report',
} as const;
export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

export interface StorageMigration {
  readonly id: string;
  readonly description: string;
  /** Target schema version after applying. */
  readonly version: number;
}

export interface StorageHealth {
  readonly status: 'healthy' | 'degraded' | 'unavailable';
  readonly schemaVersion: number;
  readonly detail?: string;
  readonly checkedAt: string;
}

/**
 * The single object the host wires into every engine. Adding a backend means
 * implementing this once.
 */
export interface StorageProvider extends UnitOfWork {
  readonly name: string;
  /** Typed repository accessor for a canonical collection. */
  repository<T extends { id: string }>(collection: CollectionName): Repository<T>;
  readonly audit: AppendOnlyRepository<AuditRecord>;
  readonly blobs: BlobStore;
  readonly kv: KeyValueStore;
  /** Applies pending migrations; must be idempotent. */
  migrate(): Promise<Result<{ applied: StorageMigration[] }>>;
  health(): Promise<StorageHealth>;
  /** Consistent snapshot export, for backup and for "export engagement". */
  export(options?: { collections?: CollectionName[]; sessionId?: string }): AsyncIterable<Uint8Array>;
  close(): Promise<void>;
}

/* -------------------------------------------------------------------------- */
/* Typed aliases                                                               */
/* -------------------------------------------------------------------------- */

export type SessionRepository = Repository<Session>;
export type SessionStepRepository = Repository<SessionStep>;
export type ApprovalRepository = Repository<ApprovalRequest>;
export type ScopeRepository = Repository<EngagementScope & { id: string }>;
export type AuthorizationRepository = Repository<AuthorizationRecord>;
export type FindingRepository = Repository<Finding>;
export type EvidenceRepository = Repository<Evidence>;
export type ArtifactRepository = Repository<Artifact>;
export type PromptModuleRepository = Repository<PromptModule>;
export type PluginRepository = Repository<InstalledPlugin>;
