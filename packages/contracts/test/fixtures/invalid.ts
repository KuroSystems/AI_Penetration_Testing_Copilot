/**
 * Negative fixtures.
 *
 * Each entry MUST be rejected by both the Zod schema and the generated JSON
 * Schema. They encode the constraints we actually care about — if a future
 * refactor loosens one of these, the suite fails loudly.
 */
import { exampleCompletionRequest, exampleMinimalSession, examplePluginManifest, examplePromptModule, exampleRequestEnvelope } from '../../src/examples.js';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const mutate = <T>(value: T, fn: (draft: Record<string, unknown>) => void): unknown => {
  const draft = clone(value) as unknown as Record<string, unknown>;
  fn(draft);
  return draft;
};

export interface InvalidFixture {
  readonly contract: string;
  readonly name: string;
  readonly value: unknown;
  /** What the schema is expected to reject. */
  readonly because: string;
}

export const INVALID_FIXTURES: readonly InvalidFixture[] = [
  {
    contract: 'Session',
    name: 'wrong-id-prefix',
    because: 'A finding id must not be accepted where a session id is required.',
    value: mutate(exampleMinimalSession, (d) => {
      d['id'] = 'fnd_01J9Z8Q2X4T5V6W7Y8Z9A0B3C1';
    }),
  },
  {
    contract: 'Session',
    name: 'unknown-state',
    because: 'The session lifecycle is a closed enum.',
    value: mutate(exampleMinimalSession, (d) => {
      d['state'] = 'zombie';
    }),
  },
  {
    contract: 'Session',
    name: 'missing-scope',
    because: 'A session without a scope could never be safety-checked.',
    value: mutate(exampleMinimalSession, (d) => {
      delete d['scope'];
    }),
  },
  {
    contract: 'Session',
    name: 'naive-timestamp',
    because: 'Timestamps must carry an explicit UTC offset.',
    value: mutate(exampleMinimalSession, (d) => {
      d['createdAt'] = '2026-07-30 09:00:00';
    }),
  },
  {
    contract: 'Session',
    name: 'unknown-top-level-key',
    because: 'Contract objects are closed; extras belong in `extensions`.',
    value: mutate(exampleMinimalSession, (d) => {
      d['totallyNewField'] = true;
    }),
  },
  {
    contract: 'Session',
    name: 'empty-scope-rules',
    because: 'A scope with no rules would deny everything and is almost always a bug.',
    value: mutate(exampleMinimalSession, (d) => {
      (d['scope'] as Record<string, unknown>)['rules'] = [];
    }),
  },
  {
    contract: 'PromptModule',
    name: 'bad-semver',
    because: 'Prompt modules are resolved by semver range.',
    value: mutate(examplePromptModule, (d) => {
      d['version'] = 'v1';
    }),
  },
  {
    contract: 'PromptModule',
    name: 'no-parts',
    because: 'A module with no parts renders nothing.',
    value: mutate(examplePromptModule, (d) => {
      d['parts'] = [];
    }),
  },
  {
    contract: 'PromptModule',
    name: 'invalid-key',
    because: 'Module keys are lowercase dotted slugs.',
    value: mutate(examplePromptModule, (d) => {
      d['key'] = 'Analysis Reflected Input';
    }),
  },
  {
    contract: 'RequestEnvelope',
    name: 'missing-destination',
    because: 'A request must be addressed to someone.',
    value: mutate(exampleRequestEnvelope, (d) => {
      delete d['destination'];
    }),
  },
  {
    contract: 'RequestEnvelope',
    name: 'bad-message-name',
    because: 'Message names are dotted lowercase with at least two segments.',
    value: mutate(exampleRequestEnvelope, (d) => {
      d['name'] = 'ModelCompletionCreate';
    }),
  },
  {
    contract: 'RequestEnvelope',
    name: 'missing-correlation-id',
    because: 'Every hop must be correlatable for audit and tracing.',
    value: mutate(exampleRequestEnvelope, (d) => {
      delete d['correlationId'];
    }),
  },
  {
    contract: 'EngineMessage',
    name: 'unknown-kind',
    because: 'The envelope union is closed.',
    value: mutate(exampleRequestEnvelope, (d) => {
      d['kind'] = 'command';
    }),
  },
  {
    contract: 'PluginManifest',
    name: 'missing-permissions',
    because: 'Permissions are mandatory: silence must never mean "allow".',
    value: mutate(examplePluginManifest, (d) => {
      delete d['permissions'];
    }),
  },
  {
    contract: 'PluginManifest',
    name: 'missing-contracts-range',
    because: 'A plugin must declare which contracts version it targets.',
    value: mutate(examplePluginManifest, (d) => {
      delete d['contractsRange'];
    }),
  },
  {
    contract: 'PluginManifest',
    name: 'bad-runtime-kind',
    because: 'Runtime kinds are a closed enum the host knows how to sandbox.',
    value: mutate(examplePluginManifest, (d) => {
      (d['runtime'] as Record<string, unknown>)['kind'] = 'eval';
    }),
  },
  {
    contract: 'CompletionRequest',
    name: 'no-messages',
    because: 'There is nothing to complete without at least one message.',
    value: mutate(exampleCompletionRequest, (d) => {
      d['messages'] = [];
    }),
  },
  {
    contract: 'CompletionRequest',
    name: 'temperature-out-of-range',
    because: 'Sampling parameters are bounded so providers cannot disagree.',
    value: mutate(exampleCompletionRequest, (d) => {
      d['temperature'] = 7;
    }),
  },
  {
    contract: 'ProviderConfig',
    name: 'raw-api-key',
    because: 'Secrets are referenced (`credentialRef`), never embedded.',
    value: {
      schemaVersion: '0.1.0',
      name: 'openai',
      kind: 'openai-compatible',
      hosting: 'remote-cloud',
      apiKey: 'sk-live-abc123',
    },
  },
  {
    contract: 'AuditRecord',
    name: 'short-hash',
    because: 'The hash chain requires a full SHA-256 digest.',
    value: {
      schemaVersion: '0.1.0',
      id: 'aud_01J9Z8Q2X4T5V6W7Y8Z9A0B1Z2',
      sequence: 1,
      recordedAt: '2026-07-30T09:15:04.250Z',
      action: 'session.step.completed',
      category: 'session',
      outcome: 'success',
      actor: { id: 'act_01J9Z8Q2X4T5V6W7Y8Z9A0B1X0', kind: 'engine' },
      summary: 'Step completed',
      hash: 'deadbeef',
    },
  },
];
