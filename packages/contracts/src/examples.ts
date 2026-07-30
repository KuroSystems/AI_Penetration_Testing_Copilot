/**
 * Canonical sample payloads
 * =========================
 * One or more realistic examples for every published contract. They are written
 * as *typed* TypeScript values, so a contract change that breaks them fails the
 * build, and they are emitted to `samples/*.json` for non-TypeScript consumers.
 *
 * Later phases should reuse these as test fixtures instead of inventing their
 * own payloads — that is how we find out early when a contract stops fitting.
 */
import type { Actor, ActorRef } from './domain/actor.js';
import type { AuthorizationRecord, EngagementScope, RulesOfEngagement, TargetAsset } from './domain/target.js';
import type { Artifact, BlobRef } from './domain/artifact.js';
import type { Evidence, Finding } from './domain/finding.js';
import type { ApprovalRequest, CreateSessionRequest, Session, SessionStep } from './session/session.js';
import type { PromptModule, PromptRenderRequest, RenderedPrompt } from './prompt/prompt-module.js';
import type {
  EngineMessage,
  EventEnvelope,
  RequestEnvelope,
  ResponseEnvelope,
  StreamChunkEnvelope,
} from './messaging/envelope.js';
import type { DomainEvent } from './messaging/events.js';
import { EVENT_NAMES } from './messaging/events.js';
import type { InstalledPlugin, PluginManifest } from './plugin/manifest.js';
import type {
  CompletionRequest,
  CompletionResponse,
  CompletionStreamEvent,
  EmbeddingRequest,
  EmbeddingResponse,
  ModelDescriptor,
  ProviderConfig,
} from './model/provider.js';
import type { AuditRecord, MetricSample, Span } from './audit/audit.js';
import { CONTRACTS_VERSION } from './registry.js';

/* -------------------------------------------------------------------------- */
/* Fixed ids so examples cross-reference each other coherently                 */
/* -------------------------------------------------------------------------- */

export const EXAMPLE_IDS = {
  session: 'ses_01J9Z8Q2X4T5V6W7Y8Z9A0B1C2',
  step: 'stp_01J9Z8Q2X4T5V6W7Y8Z9A0B1D3',
  step2: 'stp_01J9Z8Q2X4T5V6W7Y8Z9A0B1D4',
  engagement: 'eng_01J9Z8Q2X4T5V6W7Y8Z9A0B1E5',
  authorization: 'auth_01J9Z8Q2X4T5V6W7Y8Z9A0B1F6',
  target: 'tgt_01J9Z8Q2X4T5V6W7Y8Z9A0B1G7',
  finding: 'fnd_01J9Z8Q2X4T5V6W7Y8Z9A0B1H8',
  evidence: 'evd_01J9Z8Q2X4T5V6W7Y8Z9A0B1J9',
  artifact: 'art_01J9Z8Q2X4T5V6W7Y8Z9A0B1K0',
  promptModule: 'pmd_01J9Z8Q2X4T5V6W7Y8Z9A0B1M1',
  promptRender: 'prn_01J9Z8Q2X4T5V6W7Y8Z9A0B1N2',
  message: 'msg_01J9Z8Q2X4T5V6W7Y8Z9A0B1P3',
  message2: 'msg_01J9Z8Q2X4T5V6W7Y8Z9A0B1Q4',
  correlation: 'cor_01J9Z8Q2X4T5V6W7Y8Z9A0B1R5',
  plugin: 'plg_01J9Z8Q2X4T5V6W7Y8Z9A0B1S6',
  toolCall: 'tcl_01J9Z8Q2X4T5V6W7Y8Z9A0B1T7',
  modelCall: 'mcl_01J9Z8Q2X4T5V6W7Y8Z9A0B1V8',
  actorHuman: 'act_01J9Z8Q2X4T5V6W7Y8Z9A0B1W9',
  actorEngine: 'act_01J9Z8Q2X4T5V6W7Y8Z9A0B1X0',
  approval: 'apr_01J9Z8Q2X4T5V6W7Y8Z9A0B1Y1',
  audit: 'aud_01J9Z8Q2X4T5V6W7Y8Z9A0B1Z2',
} as const;

const T0 = '2026-07-30T09:00:00.000Z';
const T1 = '2026-07-30T09:15:00.000Z';
const T2 = '2026-07-30T09:15:04.250Z';
const DIGEST = 'sha256:b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9';
const HASH = 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9';

/* -------------------------------------------------------------------------- */
/* Domain                                                                      */
/* -------------------------------------------------------------------------- */

export const exampleActor: Actor = {
  id: EXAMPLE_IDS.actorHuman,
  kind: 'human',
  displayName: 'A. Tester',
  roles: ['lead-tester'],
  subject: 'local:atester',
  email: 'atester@example.com',
  authenticatedAt: T0,
};

export const exampleActorRef: ActorRef = {
  id: EXAMPLE_IDS.actorEngine,
  kind: 'engine',
  displayName: 'orchestration',
};

export const exampleTargetAsset: TargetAsset = {
  id: EXAMPLE_IDS.target,
  kind: 'web-application',
  identifier: 'https://shop.example.com',
  displayName: 'Storefront',
  hostnames: ['shop.example.com'],
  ipAddresses: ['203.0.113.10'],
  urls: ['https://shop.example.com'],
  ports: [{ from: 443, to: 443 }],
  protocols: ['tcp'],
  environment: 'staging',
  criticality: 4,
  dataSensitivity: 'confidential',
  owner: 'Web Platform Team',
  tags: ['pci', 'external'],
  attributes: { stack: 'nginx/1.25 + node 20', waf: 'cloudflare' },
};

export const exampleRulesOfEngagement: RulesOfEngagement = {
  allowedActivities: ['passive-recon', 'active-scan', 'vulnerability-scan', 'authenticated-scan'],
  forbiddenActivities: ['denial-of-service', 'social-engineering', 'physical'],
  testingWindows: [{ startsAt: '2026-07-30T00:00:00.000Z', endsAt: '2026-08-06T00:00:00.000Z', note: 'Agreed window' }],
  maxRequestsPerSecond: 20,
  maxConcurrentTasks: 4,
  requiresApprovalFor: ['exploitation', 'post-exploitation'],
  allowRemoteModelEgress: false,
  dataHandling: 'confidential',
  emergencyContact: 'soc@example.com / +1-555-0100',
  notes: 'Stop immediately on any sign of production impact.',
};

export const exampleEngagementScope: EngagementScope = {
  engagementId: EXAMPLE_IDS.engagement,
  name: 'Example Corp — external web assessment',
  description: 'Grey-box assessment of the public storefront and its API.',
  client: 'Example Corp',
  rules: [
    { effect: 'include', kind: 'domain', pattern: '*.example.com', note: 'All staging subdomains' },
    { effect: 'include', kind: 'ip-range', pattern: '203.0.113.0/24', ports: [{ from: 1, to: 65535 }] },
    { effect: 'exclude', kind: 'url', pattern: 'https://shop.example.com/admin/*', note: 'Client request' },
    { effect: 'exclude', kind: 'domain', pattern: 'payments.example.com', note: 'Third-party processor' },
  ],
  targets: [exampleTargetAsset],
  rulesOfEngagement: exampleRulesOfEngagement,
  startsAt: '2026-07-30T00:00:00.000Z',
  endsAt: '2026-08-06T00:00:00.000Z',
  tags: ['external', 'web'],
};

export const exampleAuthorizationRecord: AuthorizationRecord = {
  id: EXAMPLE_IDS.authorization,
  engagementId: EXAMPLE_IDS.engagement,
  method: 'signed-document',
  grantedBy: 'J. Client',
  grantedByRole: 'CISO, Example Corp',
  attestedBy: EXAMPLE_IDS.actorHuman,
  grantedAt: '2026-07-25T10:00:00.000Z',
  validFrom: '2026-07-30T00:00:00.000Z',
  validUntil: '2026-08-06T00:00:00.000Z',
  documentRef: 'art_01J9Z8Q2X4T5V6W7Y8Z9A0B1K0',
  documentHash: HASH,
  notes: 'Counter-signed engagement letter, revision 2.',
};

export const exampleBlobRef: BlobRef = {
  uri: 'blob://sha256/b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9',
  mediaType: 'text/plain',
  sizeBytes: 4096,
  digest: DIGEST,
  encoding: 'identity',
};

export const exampleArtifact: Artifact = {
  id: EXAMPLE_IDS.artifact,
  kind: 'tool-output',
  name: 'nmap-top1000-203.0.113.10.txt',
  description: 'Raw nmap output for the storefront host.',
  sessionId: EXAMPLE_IDS.session,
  targetId: EXAMPLE_IDS.target,
  producedBy: 'aiptc.recon-nmap',
  producedAt: T1,
  createdBy: EXAMPLE_IDS.actorEngine,
  content: exampleBlobRef,
  sensitivity: 'confidential',
  redactions: [{ pointer: '/env/API_TOKEN', mode: 'drop', reason: 'Credential material' }],
  integrityDigest: DIGEST,
  retainUntil: '2027-07-30T00:00:00.000Z',
  tags: ['recon'],
  metadata: { tool: 'nmap', version: '7.95' },
};

export const exampleEvidence: Evidence = {
  id: EXAMPLE_IDS.evidence,
  kind: 'request-response',
  summary: 'Reflected parameter rendered without encoding',
  detail: 'The `q` parameter is echoed into the HTML body unescaped.',
  collectedAt: T1,
  collectedBy: EXAMPLE_IDS.actorEngine,
  sessionId: EXAMPLE_IDS.session,
  targetId: EXAMPLE_IDS.target,
  artifactIds: [EXAMPLE_IDS.artifact],
  reproduction: {
    tool: 'curl',
    command: "curl -s 'https://shop.example.com/search?q=%3Cb%3Etest%3C%2Fb%3E'",
    request: 'GET /search?q=<b>test</b> HTTP/1.1',
    response: 'HTTP/1.1 200 OK … <div class="results">You searched for <b>test</b></div>',
  },
  confidence: 0.9,
  humanVerified: false,
};

export const exampleFinding: Finding = {
  id: EXAMPLE_IDS.finding,
  fingerprint: 'shop.example.com|reflected-xss|/search:q',
  title: 'Reflected cross-site scripting in product search',
  summary: 'The search endpoint reflects the `q` parameter into the response without output encoding.',
  detail: 'An attacker can craft a link that executes JavaScript in a victim browser in the origin of the storefront.',
  status: 'proposed',
  severity: 'high',
  confidence: 0.85,
  cvss: {
    version: '3.1',
    vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N',
    baseScore: 6.1,
  },
  classification: {
    cwe: ['CWE-79'],
    owaspTop10: ['A03:2021'],
    mitreAttack: ['T1059.007'],
  },
  sessionId: EXAMPLE_IDS.session,
  targetIds: [EXAMPLE_IDS.target],
  location: { uri: 'https://shop.example.com/search', parameter: 'q', method: 'GET' },
  evidenceIds: [EXAMPLE_IDS.evidence],
  impact: 'Session hijacking of authenticated shoppers, phishing within a trusted origin.',
  likelihood: 'medium',
  remediation: {
    summary: 'Context-aware output encoding plus a strict Content-Security-Policy.',
    effort: 'low',
    references: ['https://owasp.org/www-community/attacks/xss/'],
  },
  discoveredVia: 'vulnerability-scan',
  discoveredAt: T1,
  reportedBy: EXAMPLE_IDS.actorEngine,
  tags: ['web', 'xss'],
};

/* -------------------------------------------------------------------------- */
/* Session                                                                     */
/* -------------------------------------------------------------------------- */

export const exampleSession: Session = {
  schemaVersion: CONTRACTS_VERSION,
  id: EXAMPLE_IDS.session,
  engagementId: EXAMPLE_IDS.engagement,
  authorizationId: EXAMPLE_IDS.authorization,
  title: 'External web assessment — week 1',
  description: 'Automated recon and vulnerability analysis with human approval for exploitation.',
  state: 'running',
  phase: 'vulnerability-analysis',
  autonomy: 'supervised',
  scope: exampleEngagementScope,
  objectives: [
    { id: 'obj-1', statement: 'Enumerate all externally reachable services', priority: 'must', satisfied: true },
    { id: 'obj-2', statement: 'Identify OWASP Top 10 exposure in the storefront', priority: 'must', satisfied: false },
  ],
  participants: [
    { actorId: EXAMPLE_IDS.actorHuman, role: 'lead-tester', joinedAt: T0 },
    { actorId: EXAMPLE_IDS.actorEngine, role: 'automation', joinedAt: T0 },
  ],
  ownerActorId: EXAMPLE_IDS.actorHuman,
  modelPolicy: {
    preferred: ['ollama/llama3.1:70b', 'ollama/qwen2.5-coder:32b'],
    fallback: ['ollama/llama3.1:8b'],
    requireLocalOnly: true,
    maxEgressSensitivity: 'internal',
    temperature: 0.2,
    maxOutputTokens: 4096,
    seed: 1337,
  },
  budget: {
    maxWallClockMs: 14_400_000,
    maxModelCalls: 500,
    maxInputTokens: 2_000_000,
    maxOutputTokens: 400_000,
    maxToolInvocations: 300,
    maxCost: { currency: 'USD', minorUnits: 2_000 },
    softStopThreshold: 0.9,
  },
  usage: {
    elapsedMs: 900_000,
    modelCalls: 42,
    inputTokens: 180_400,
    outputTokens: 31_250,
    toolInvocations: 17,
    estimatedCost: { currency: 'USD', minorUnits: 0 },
    findingsCount: 3,
    errorsCount: 1,
  },
  context: {
    conversationId: 'cnv_01J9Z8Q2X4T5V6W7Y8Z9A0B2A1',
    knowledgeCollections: ['owasp-wstg', 'client-notes'],
    pinnedPromptModuleIds: [EXAMPLE_IDS.promptModule],
    enabledPluginIds: [EXAMPLE_IDS.plugin],
    summary: 'Recon complete: 4 hosts, 9 services. Storefront search endpoint looks XSS-prone.',
    scratchpad: { planning: { openQuestions: ['Is /admin truly out of scope?'] } },
  },
  stepIds: [EXAMPLE_IDS.step, EXAMPLE_IDS.step2],
  pendingApprovalIds: [EXAMPLE_IDS.approval],
  findingIds: [EXAMPLE_IDS.finding],
  createdAt: T0,
  updatedAt: T2,
  startedAt: T0,
  revision: 27,
  createdByVersion: '0.1.0',
  timezone: 'Asia/Kolkata',
  sensitivity: 'confidential',
  tags: ['web', 'external'],
  metadata: { ticket: 'PT-1042' },
};

/** Smallest legal session: a freshly created draft. */
export const exampleMinimalSession: Session = {
  schemaVersion: CONTRACTS_VERSION,
  id: 'ses_01J9Z8Q2X4T5V6W7Y8Z9A0B3C1',
  engagementId: EXAMPLE_IDS.engagement,
  title: 'Draft session',
  state: 'draft',
  autonomy: 'advisory',
  scope: {
    engagementId: EXAMPLE_IDS.engagement,
    name: 'Lab only',
    rules: [{ effect: 'include', kind: 'ip-range', pattern: '10.10.10.0/24' }],
    rulesOfEngagement: { allowedActivities: ['passive-recon'] },
  },
  ownerActorId: EXAMPLE_IDS.actorHuman,
  createdAt: T0,
  updatedAt: T0,
  revision: 0,
};

export const exampleSessionStep: SessionStep = {
  id: EXAMPLE_IDS.step,
  sessionId: EXAMPLE_IDS.session,
  sequence: 12,
  title: 'Fuzz search parameter for reflected input',
  intent: 'Confirm whether the `q` parameter is reflected without encoding.',
  phase: 'vulnerability-analysis',
  activityClass: 'vulnerability-scan',
  status: 'succeeded',
  executor: 'plugin',
  executorRef: 'aiptc.web-fuzzer.reflect',
  promptModuleId: EXAMPLE_IDS.promptModule,
  pluginId: EXAMPLE_IDS.plugin,
  input: { url: 'https://shop.example.com/search', parameter: 'q', payloadSet: 'reflection-basic' },
  output: { reflected: true, encoded: false, samples: 3 },
  startedAt: T1,
  endedAt: T2,
  durationMs: 4_250,
  producedFindingIds: [EXAMPLE_IDS.finding],
  producedArtifactIds: [EXAMPLE_IDS.artifact],
  dependsOn: [EXAMPLE_IDS.step2],
  attempt: 1,
  tags: ['web'],
};

export const exampleApprovalRequest: ApprovalRequest = {
  id: EXAMPLE_IDS.approval,
  sessionId: EXAMPLE_IDS.session,
  requestedAt: T2,
  requestedBy: EXAMPLE_IDS.actorEngine,
  summary: 'Run an authenticated exploitation check against the storefront search endpoint',
  detail: 'Sends a benign proof-of-concept payload that writes a marker string into the DOM.',
  activityClass: 'exploitation',
  blocks: [EXAMPLE_IDS.step2],
  riskLevel: 'medium',
  expiresAt: '2026-07-30T11:00:00.000Z',
  status: 'pending',
};

export const exampleCreateSessionRequest: CreateSessionRequest = {
  engagementId: EXAMPLE_IDS.engagement,
  authorizationId: EXAMPLE_IDS.authorization,
  title: 'External web assessment — week 1',
  autonomy: 'supervised',
  scope: exampleEngagementScope,
  ownerActorId: EXAMPLE_IDS.actorHuman,
  budget: { maxWallClockMs: 14_400_000, maxModelCalls: 500 },
  tags: ['web'],
};

/* -------------------------------------------------------------------------- */
/* Prompt                                                                      */
/* -------------------------------------------------------------------------- */

export const examplePromptModule: PromptModule = {
  schemaVersion: CONTRACTS_VERSION,
  id: EXAMPLE_IDS.promptModule,
  key: 'analysis.reflected-input-triage',
  version: '1.2.0',
  kind: 'task',
  title: 'Triage reflected input for XSS',
  description: 'Decides whether a reflected parameter is exploitable and proposes a proof of concept.',
  status: 'approved',
  language: 'en',
  templateEngine: 'mustache',
  parts: [
    {
      role: 'system',
      content:
        'You are assisting an authorised penetration test. Only reason about the target described below. Never fabricate evidence.',
      cacheable: true,
      order: 0,
    },
    {
      role: 'user',
      content:
        'Target: {{targetUrl}}\nParameter: {{parameter}}\nObserved response excerpt:\n```\n{{responseExcerpt}}\n```\nDecide whether this is exploitable and explain why.',
      order: 10,
    },
  ],
  extends: ['persona.pentest-analyst@^1.0.0'],
  requires: ['guardrail.scope-discipline@^1.0.0'],
  conflictsWith: ['persona.red-team-operator@^1.0.0'],
  priority: 100,
  variables: [
    { name: 'targetUrl', type: 'string', required: true, description: 'Absolute URL under test', example: 'https://shop.example.com/search' },
    { name: 'parameter', type: 'string', required: true, description: 'Reflected parameter name', example: 'q' },
    {
      name: 'responseExcerpt',
      type: 'string',
      required: true,
      description: 'Raw response snippet containing the reflection',
      maxLength: 4000,
      sensitivity: 'confidential',
      trust: 'untrusted',
      sanitizer: 'fenced',
    },
  ],
  outputSchema: {
    type: 'object',
    required: ['exploitable', 'rationale'],
    properties: {
      exploitable: { type: 'boolean' },
      rationale: { type: 'string' },
      proofOfConcept: { type: 'string' },
      confidence: { type: 'number', minimum: 0, maximum: 1 },
    },
    additionalProperties: false,
  },
  outputFormat: 'json-schema',
  expectedTools: ['http.request'],
  modelRequirements: {
    minContextTokens: 8_000,
    maxOutputTokens: 1_024,
    capabilities: ['json-schema', 'reasoning'],
    preferredModels: ['ollama/llama3.1:70b'],
    temperature: 0.1,
    stopSequences: ['\n\n---'],
    estimatedPromptTokens: 900,
  },
  safety: {
    activityClasses: ['vulnerability-scan'],
    requiresApproval: false,
    requiresScope: true,
    maxSensitivity: 'confidential',
    localModelsOnly: true,
    reviewNotes: 'Reviewed 2026-07-20; no instructions that could cause active exploitation.',
  },
  examples: [
    {
      name: 'unencoded reflection',
      variables: { targetUrl: 'https://shop.example.com/search', parameter: 'q', responseExcerpt: '<div><b>test</b></div>' },
      expectedOutput: '{"exploitable":true,"rationale":"Tags are rendered unencoded."}',
      inject: false,
    },
  ],
  evaluations: [
    { name: 'returns valid json', kind: 'json-schema', criterion: '{"type":"object","required":["exploitable"]}', severity: 'error' },
    { name: 'no fabricated payloads', kind: 'not-contains', criterion: 'I assume', severity: 'warning' },
  ],
  author: 'AIPTC core',
  ownerActorId: EXAMPLE_IDS.actorHuman,
  license: 'MIT',
  references: ['https://owasp.org/www-project-web-security-testing-guide/'],
  contentDigest: DIGEST,
  contractsRange: '^0.1.0',
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-07-20T00:00:00.000Z',
  tags: ['web', 'xss', 'triage'],
};

export const examplePromptRenderRequest: PromptRenderRequest = {
  moduleKey: 'analysis.reflected-input-triage',
  versionRange: '^1.2.0',
  sessionId: EXAMPLE_IDS.session,
  variables: {
    targetUrl: 'https://shop.example.com/search',
    parameter: 'q',
    responseExcerpt: '<div class="results">You searched for <b>test</b></div>',
  },
  compose: ['guardrail.scope-discipline@^1.0.0'],
  strictTokenBudget: true,
  maxPromptTokens: 6_000,
};

export const exampleRenderedPrompt: RenderedPrompt = {
  id: EXAMPLE_IDS.promptRender,
  composedFrom: [
    'guardrail.scope-discipline@1.0.3',
    'persona.pentest-analyst@1.1.0',
    'analysis.reflected-input-triage@1.2.0',
  ],
  messages: [
    { role: 'system', content: 'You are assisting an authorised penetration test…', cacheable: true },
    { role: 'user', content: 'Target: https://shop.example.com/search\nParameter: q\n…' },
  ],
  outputSchema: { type: 'object', required: ['exploitable'], properties: { exploitable: { type: 'boolean' } } },
  estimatedTokens: 912,
  digest: DIGEST,
  renderedAt: T1,
  truncated: false,
  warnings: [],
};

/* -------------------------------------------------------------------------- */
/* Messaging                                                                   */
/* -------------------------------------------------------------------------- */

export const exampleRequestEnvelope: RequestEnvelope = {
  schemaVersion: CONTRACTS_VERSION,
  kind: 'request',
  id: EXAMPLE_IDS.message,
  name: 'model.completion.create',
  source: 'orchestration',
  destination: 'model-gateway',
  replyTo: 'orchestration',
  createdAt: T1,
  correlationId: EXAMPLE_IDS.correlation,
  sessionId: EXAMPLE_IDS.session,
  actor: exampleActorRef,
  trace: { traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01' },
  priority: 'normal',
  deliveryMode: 'at-most-once',
  idempotencyKey: 'ses_01J9Z8Q2X4T5V6W7Y8Z9A0B1C2:step:12:attempt:1',
  attempt: 1,
  timeoutMs: 60_000,
  stream: false,
  contentType: 'application/json',
  payloadSchema: { id: 'CompletionRequest', version: CONTRACTS_VERSION },
  sensitivity: 'confidential',
  redactions: [{ pointer: '/messages/1/content', mode: 'hash', reason: 'May contain target response data' }],
  payload: { model: 'ollama/llama3.1:70b', messages: [{ role: 'user', content: 'Summarise the recon findings.' }] },
};

export const exampleResponseEnvelope: ResponseEnvelope = {
  schemaVersion: CONTRACTS_VERSION,
  kind: 'response',
  id: EXAMPLE_IDS.message2,
  name: 'model.completion.create',
  source: 'model-gateway',
  destination: 'orchestration',
  createdAt: T2,
  correlationId: EXAMPLE_IDS.correlation,
  causationId: EXAMPLE_IDS.message,
  inReplyTo: EXAMPLE_IDS.message,
  sessionId: EXAMPLE_IDS.session,
  status: 'ok',
  durationMs: 4_250,
  payloadSchema: { id: 'CompletionResponse', version: CONTRACTS_VERSION },
  payload: { finishReason: 'stop', text: 'Four hosts, nine services, one likely XSS.' },
};

export const exampleErrorResponseEnvelope: ResponseEnvelope = {
  schemaVersion: CONTRACTS_VERSION,
  kind: 'response',
  id: 'msg_01J9Z8Q2X4T5V6W7Y8Z9A0B2B2',
  name: 'tool.invoke',
  source: 'plugin-host',
  destination: 'orchestration',
  createdAt: T2,
  correlationId: EXAMPLE_IDS.correlation,
  inReplyTo: EXAMPLE_IDS.message,
  status: 'error',
  error: {
    code: 'out_of_scope',
    message: 'Target 198.51.100.4 is not covered by any include rule.',
    source: 'policy',
    retryable: false,
    occurredAt: T2,
    remediation: 'Add the host to the engagement scope or pick another target.',
    data: { target: '198.51.100.4' },
  },
};

export const exampleEventEnvelope: EventEnvelope = {
  schemaVersion: CONTRACTS_VERSION,
  kind: 'event',
  id: 'msg_01J9Z8Q2X4T5V6W7Y8Z9A0B2C3',
  name: EVENT_NAMES.STEP_COMPLETED,
  topic: EVENT_NAMES.STEP_COMPLETED,
  source: 'orchestration',
  createdAt: T2,
  correlationId: EXAMPLE_IDS.correlation,
  sessionId: EXAMPLE_IDS.session,
  subject: EXAMPLE_IDS.step,
  sequence: 12,
  actor: exampleActorRef,
  deliveryMode: 'at-least-once',
  payloadSchema: { id: 'StepEventPayload', version: CONTRACTS_VERSION },
  payload: {
    sessionId: EXAMPLE_IDS.session,
    stepId: EXAMPLE_IDS.step,
    sequence: 12,
    title: 'Fuzz search parameter for reflected input',
    status: 'succeeded',
    activityClass: 'vulnerability-scan',
    durationMs: 4_250,
  },
};

export const exampleStreamChunkEnvelope: StreamChunkEnvelope = {
  schemaVersion: CONTRACTS_VERSION,
  kind: 'stream',
  id: 'msg_01J9Z8Q2X4T5V6W7Y8Z9A0B2D4',
  name: 'model.completion.create',
  source: 'model-gateway',
  destination: 'orchestration',
  createdAt: T2,
  correlationId: EXAMPLE_IDS.correlation,
  inReplyTo: EXAMPLE_IDS.message,
  sequence: 7,
  final: false,
  payload: { type: 'text-delta', delta: 'Four hosts, ' },
};

export const exampleEngineMessage: EngineMessage = exampleRequestEnvelope;

export const exampleDomainEvent: DomainEvent = {
  name: EVENT_NAMES.SESSION_STATE_CHANGED,
  occurredAt: T1,
  subject: EXAMPLE_IDS.session,
  payload: { sessionId: EXAMPLE_IDS.session, from: 'authorized', to: 'running', changedAt: T1 },
};

/* -------------------------------------------------------------------------- */
/* Plugin                                                                      */
/* -------------------------------------------------------------------------- */

export const examplePluginManifest: PluginManifest = {
  schemaVersion: CONTRACTS_VERSION,
  name: 'aiptc.recon-nmap',
  version: '0.3.1',
  displayName: 'Nmap recon',
  description: 'Wraps nmap for host discovery and service enumeration, constrained to in-scope targets.',
  contractsRange: '^0.1.0',
  hostRange: '>=0.1.0 <1.0.0',
  author: 'AIPTC core',
  license: 'MIT',
  homepage: 'https://example.com/aiptc/plugins/recon-nmap',
  repository: 'https://github.com/example/aiptc-recon-nmap',
  category: 'recon',
  keywords: ['nmap', 'recon', 'network'],
  runtime: {
    kind: 'child-process',
    entry: 'dist/main.js',
    runtimeVersion: '>=20.10.0',
    command: 'node',
    args: ['dist/main.js', '--stdio'],
    transport: 'stdio',
    restart: 'on-failure',
    healthCheckIntervalMs: 30_000,
  },
  contributes: {
    tools: [
      {
        name: 'nmap.scan',
        title: 'Nmap scan',
        description: 'Runs an nmap scan against an in-scope target and returns parsed results.',
        inputSchema: {
          type: 'object',
          required: ['target'],
          properties: {
            target: { type: 'string', description: 'Hostname, IP or CIDR' },
            ports: { type: 'string', description: 'Nmap port spec, e.g. "1-1000"' },
            profile: { type: 'string', enum: ['discovery', 'top-ports', 'service-version'] },
          },
          additionalProperties: false,
        },
        outputSchema: {
          type: 'object',
          properties: { hosts: { type: 'array', items: { type: 'object' } } },
        },
        readOnly: false,
        idempotent: true,
        activityClasses: ['active-scan'],
        requiresApproval: false,
        maxInputSensitivity: 'internal',
        timeoutMs: 900_000,
        costHint: 3,
        examples: [{ description: 'Top ports sweep', arguments: { target: '203.0.113.10', profile: 'top-ports' } }],
      },
    ],
    promptModules: ['recon.nmap-result-summary'],
    eventSubscriptions: ['session.session.state-changed'],
  },
  permissions: {
    network: { mode: 'scope-targets', allowProtocols: ['tcp', 'udp'] },
    filesystem: { mode: 'workspace', writePaths: ['artifacts/nmap'] },
    process: { mode: 'allowlist', allowBinaries: ['nmap'] },
    environment: ['NMAP_PRIVILEGED'],
    model: { allowed: false },
    storage: { read: ['target'], write: ['artifact'], privateState: true },
    events: { subscribe: ['session.*'] },
    engineCalls: ['policy.scope.check'],
    maxSensitivity: 'confidential',
  },
  limits: {
    maxMemoryMb: 512,
    maxCpuPercent: 50,
    maxInvocationMs: 900_000,
    maxConcurrentInvocations: 2,
    maxOutputBytes: 10_485_760,
  },
  configSchema: {
    type: 'object',
    properties: {
      nmapPath: { type: 'string', default: 'nmap' },
      defaultProfile: { type: 'string', enum: ['discovery', 'top-ports', 'service-version'], default: 'top-ports' },
    },
    additionalProperties: false,
  },
  defaultConfig: { nmapPath: 'nmap', defaultProfile: 'top-ports' },
  activationEvents: ['onTool:nmap.scan', 'onPhase:reconnaissance'],
  systemRequirements: [{ binary: 'nmap', versionRange: '>=7.90.0' }],
  integrity: DIGEST,
  signature: {
    algorithm: 'ed25519',
    publicKeyId: 'aiptc-core-2026',
    value: 'MEUCIQDf5o2m1p0k3h9t7Yb1w2Q3r4S5t6U7v8W9x0Y1z2A3bAIgQm',
    signedAt: '2026-07-01T00:00:00.000Z',
  },
  trust: 'first-party',
  safety: {
    activityClasses: ['active-scan', 'passive-recon'],
    advisoryOnly: false,
    requiresApprovalOnActivate: false,
    destructiveOperations: [],
  },
};

export const exampleInstalledPlugin: InstalledPlugin = {
  id: EXAMPLE_IDS.plugin,
  manifest: examplePluginManifest,
  installedAt: '2026-07-10T08:00:00.000Z',
  installedFrom: 'file:///opt/aiptc/plugins/recon-nmap-0.3.1.tgz',
  enabled: true,
  grantedPermissions: {
    network: { mode: 'scope-targets', allowProtocols: ['tcp'] },
    process: { mode: 'allowlist', allowBinaries: ['nmap'] },
    model: { allowed: false },
    storage: { read: ['target'], write: ['artifact'], privateState: true },
  },
  config: { nmapPath: '/usr/bin/nmap', defaultProfile: 'top-ports' },
  state: 'active',
};

/* -------------------------------------------------------------------------- */
/* Model                                                                       */
/* -------------------------------------------------------------------------- */

export const exampleModelDescriptor: ModelDescriptor = {
  ref: 'ollama/llama3.1:70b',
  providerName: 'ollama',
  modelName: 'llama3.1:70b',
  displayName: 'Llama 3.1 70B (local)',
  family: 'llama',
  version: '3.1',
  hosting: 'local',
  capabilities: ['chat', 'tools', 'json-mode', 'json-schema', 'streaming', 'system-prompt', 'seed', 'stop-sequences'],
  contextWindowTokens: 131_072,
  maxOutputTokens: 8_192,
  inputModalities: ['text'],
  maxSensitivity: 'restricted',
  knowledgeCutoff: '2024-12',
};

export const exampleProviderConfig: ProviderConfig = {
  schemaVersion: CONTRACTS_VERSION,
  name: 'ollama',
  displayName: 'Ollama (local)',
  kind: 'ollama',
  baseUrl: 'http://127.0.0.1:11434',
  hosting: 'local',
  defaultModel: 'ollama/llama3.1:8b',
  timeoutMs: 120_000,
  maxRetries: 2,
  rateLimit: { maxConcurrent: 2 },
  models: [exampleModelDescriptor],
  enabled: true,
};

export const exampleCompletionRequest: CompletionRequest = {
  callId: EXAMPLE_IDS.modelCall,
  sessionId: EXAMPLE_IDS.session,
  model: 'ollama/llama3.1:70b',
  messages: [
    { role: 'system', content: [{ type: 'text', text: 'You assist an authorised penetration test.', cacheable: true }] },
    { role: 'user', content: 'Given the nmap output below, list the three most promising follow-ups.' },
    {
      role: 'assistant',
      content: [
        {
          type: 'tool-call',
          toolCallId: EXAMPLE_IDS.toolCall,
          toolName: 'nmap.scan',
          arguments: { target: '203.0.113.10', profile: 'service-version' },
        },
      ],
    },
    {
      role: 'tool',
      content: [
        {
          type: 'tool-result',
          toolCallId: EXAMPLE_IDS.toolCall,
          toolName: 'nmap.scan',
          result: { hosts: [{ ip: '203.0.113.10', ports: [443, 8443] }] },
        },
      ],
    },
  ],
  tools: [
    {
      name: 'nmap.scan',
      description: 'Run an nmap scan against an in-scope target.',
      inputSchema: { type: 'object', required: ['target'], properties: { target: { type: 'string' } } },
      readOnly: false,
    },
  ],
  toolChoice: 'auto',
  responseFormat: { type: 'json-schema', name: 'followups', schema: { type: 'object', properties: { items: { type: 'array' } } }, strict: true },
  temperature: 0.2,
  maxOutputTokens: 1_024,
  stopSequences: ['\n\n---'],
  seed: 1337,
  timeoutMs: 90_000,
  idempotencyKey: 'ses_01J9Z8Q2X4T5V6W7Y8Z9A0B1C2:step:12',
  sensitivity: 'confidential',
  providerOptions: { num_ctx: 32_768 },
  metadata: { phase: 'vulnerability-analysis' },
};

export const exampleCompletionResponse: CompletionResponse = {
  callId: EXAMPLE_IDS.modelCall,
  model: 'ollama/llama3.1:70b',
  providerResponseId: 'ollama-7f3c',
  message: { role: 'assistant', content: [{ type: 'text', text: '1. Enumerate the 8443 admin panel…' }] },
  text: '1. Enumerate the 8443 admin panel…',
  finishReason: 'stop',
  usage: { inputTokens: 1_842, outputTokens: 311, totalTokens: 2_153, cachedInputTokens: 1_024 },
  estimatedCost: { currency: 'USD', minorUnits: 0 },
  createdAt: T2,
  latencyMs: 4_250,
  firstTokenMs: 380,
  promptDigest: DIGEST,
  cached: false,
  warnings: [],
};

export const exampleCompletionStreamEvent: CompletionStreamEvent = {
  type: 'text-delta',
  delta: '1. Enumerate the ',
};

export const exampleEmbeddingRequest: EmbeddingRequest = {
  model: 'ollama/nomic-embed-text',
  input: ['Reflected XSS in the storefront search endpoint'],
  dimensions: 768,
  sensitivity: 'internal',
};

export const exampleEmbeddingResponse: EmbeddingResponse = {
  model: 'ollama/nomic-embed-text',
  embeddings: [[0.0121, -0.3312, 0.7781]],
  usage: { inputTokens: 11, totalTokens: 11 },
  createdAt: T2,
};

/* -------------------------------------------------------------------------- */
/* Audit & telemetry                                                           */
/* -------------------------------------------------------------------------- */

export const exampleAuditRecord: AuditRecord = {
  schemaVersion: CONTRACTS_VERSION,
  id: EXAMPLE_IDS.audit,
  sequence: 4_211,
  recordedAt: T2,
  occurredAt: T2,
  action: EVENT_NAMES.STEP_COMPLETED,
  category: 'session',
  outcome: 'success',
  actor: exampleActorRef,
  target: `session:${EXAMPLE_IDS.session}`,
  sessionId: EXAMPLE_IDS.session,
  correlationId: EXAMPLE_IDS.correlation,
  causationId: EXAMPLE_IDS.message,
  activityClass: 'vulnerability-scan',
  summary: 'Step 12 completed: reflected input confirmed',
  data: { stepId: EXAMPLE_IDS.step, durationMs: 4_250 },
  redacted: true,
  sensitivity: 'confidential',
  durationMs: 4_250,
  producerVersion: '0.1.0',
  previousHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  hash: HASH,
};

export const exampleMetricSample: MetricSample = {
  name: 'model.call.duration',
  kind: 'histogram',
  value: 4_250,
  unit: 'milliseconds',
  attributes: { provider: 'ollama', model: 'llama3.1:70b', outcome: 'ok' },
  recordedAt: T2,
  sessionId: EXAMPLE_IDS.session,
};

export const exampleSpan: Span = {
  traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
  spanId: '00f067aa0ba902b7',
  parentSpanId: '00f067aa0ba902b6',
  name: 'model.completion.create',
  kind: 'client',
  startedAt: T1,
  endedAt: T2,
  durationMs: 4_250,
  status: 'ok',
  attributes: { model: 'ollama/llama3.1:70b', inputTokens: 1_842 },
  events: [{ name: 'first-token', at: '2026-07-30T09:15:00.380Z' }],
  sessionId: EXAMPLE_IDS.session,
  correlationId: EXAMPLE_IDS.correlation,
};

/* -------------------------------------------------------------------------- */
/* Index                                                                       */
/* -------------------------------------------------------------------------- */

export interface ContractExample {
  /** Contract id the payload conforms to. */
  readonly contract: string;
  /** Short case name; becomes the sample filename suffix. */
  readonly name: string;
  readonly value: unknown;
}

/** Every example, keyed for the conformance suite and the sample emitter. */
export const EXAMPLES: readonly ContractExample[] = Object.freeze([
  { contract: 'Session', name: 'running', value: exampleSession },
  { contract: 'Session', name: 'minimal-draft', value: exampleMinimalSession },
  { contract: 'SessionStep', name: 'succeeded', value: exampleSessionStep },
  { contract: 'ApprovalRequest', name: 'pending', value: exampleApprovalRequest },
  { contract: 'CreateSessionRequest', name: 'basic', value: exampleCreateSessionRequest },

  { contract: 'PromptModule', name: 'task', value: examplePromptModule },
  { contract: 'PromptRenderRequest', name: 'by-key', value: examplePromptRenderRequest },
  { contract: 'RenderedPrompt', name: 'composed', value: exampleRenderedPrompt },

  { contract: 'EngineMessage', name: 'request', value: exampleEngineMessage },
  { contract: 'EngineMessage', name: 'event', value: exampleEventEnvelope },
  { contract: 'RequestEnvelope', name: 'model-completion', value: exampleRequestEnvelope },
  { contract: 'ResponseEnvelope', name: 'ok', value: exampleResponseEnvelope },
  { contract: 'ResponseEnvelope', name: 'error', value: exampleErrorResponseEnvelope },
  { contract: 'EventEnvelope', name: 'step-completed', value: exampleEventEnvelope },
  { contract: 'StreamChunkEnvelope', name: 'text-delta', value: exampleStreamChunkEnvelope },
  { contract: 'DomainEvent', name: 'state-changed', value: exampleDomainEvent },

  { contract: 'PluginManifest', name: 'recon-nmap', value: examplePluginManifest },
  { contract: 'InstalledPlugin', name: 'active', value: exampleInstalledPlugin },

  { contract: 'ProviderConfig', name: 'ollama', value: exampleProviderConfig },
  { contract: 'ModelDescriptor', name: 'llama-70b', value: exampleModelDescriptor },
  { contract: 'CompletionRequest', name: 'with-tools', value: exampleCompletionRequest },
  { contract: 'CompletionResponse', name: 'stop', value: exampleCompletionResponse },
  { contract: 'CompletionStreamEvent', name: 'text-delta', value: exampleCompletionStreamEvent },
  { contract: 'EmbeddingRequest', name: 'single', value: exampleEmbeddingRequest },
  { contract: 'EmbeddingResponse', name: 'single', value: exampleEmbeddingResponse },

  { contract: 'Actor', name: 'human', value: exampleActor },
  { contract: 'ActorRef', name: 'engine', value: exampleActorRef },
  { contract: 'EngagementScope', name: 'external-web', value: exampleEngagementScope },
  { contract: 'RulesOfEngagement', name: 'standard', value: exampleRulesOfEngagement },
  { contract: 'TargetAsset', name: 'web-app', value: exampleTargetAsset },
  { contract: 'AuthorizationRecord', name: 'signed-document', value: exampleAuthorizationRecord },
  { contract: 'Finding', name: 'reflected-xss', value: exampleFinding },
  { contract: 'Evidence', name: 'request-response', value: exampleEvidence },
  { contract: 'Artifact', name: 'tool-output', value: exampleArtifact },
  { contract: 'BlobRef', name: 'stored', value: exampleBlobRef },

  { contract: 'AuditRecord', name: 'step-completed', value: exampleAuditRecord },
  { contract: 'MetricSample', name: 'histogram', value: exampleMetricSample },
  { contract: 'Span', name: 'model-call', value: exampleSpan },
]);
