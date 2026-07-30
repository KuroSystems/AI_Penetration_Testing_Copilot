import { describe, expect, it } from 'vitest';
import {
  AddressSchema,
  EngineNameSchema,
} from '../src/common/ids.js';
import {
  EngineMessageSchema,
  MessageNameSchema,
  TopicPatternSchema,
} from '../src/messaging/envelope.js';
import { EVENT_CATALOG, EVENT_NAMES, EventNameSchema } from '../src/messaging/events.js';
import {
  exampleEventEnvelope,
  exampleRequestEnvelope,
  exampleResponseEnvelope,
  exampleStreamChunkEnvelope,
} from '../src/examples.js';

describe('message envelope', () => {
  it('discriminates all four kinds', () => {
    for (const message of [
      exampleRequestEnvelope,
      exampleResponseEnvelope,
      exampleEventEnvelope,
      exampleStreamChunkEnvelope,
    ]) {
      const parsed = EngineMessageSchema.safeParse(message);
      expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
    }
  });

  it('accepts engine, instance-pinned and broadcast addresses', () => {
    for (const address of ['orchestration', 'model-gateway/egn_01J9Z8Q2X4T5V6W7Y8Z9A0B1C2', '*']) {
      expect(AddressSchema.safeParse(address).success, address).toBe(true);
    }
    for (const address of ['Orchestration', 'model gateway', '']) {
      expect(AddressSchema.safeParse(address).success, address).toBe(false);
    }
  });

  it('rejects wildcards in emitted message names but allows them in patterns', () => {
    expect(MessageNameSchema.safeParse('session.step.completed').success).toBe(true);
    expect(MessageNameSchema.safeParse('session.*.completed').success).toBe(false);
    expect(TopicPatternSchema.safeParse('session.*.completed').success).toBe(true);
    expect(TopicPatternSchema.safeParse('audit.**').success).toBe(true);
    expect(TopicPatternSchema.safeParse('**').success).toBe(true);
  });
});

describe('event catalog', () => {
  it('has unique, well-formed, past-tense-ish names', () => {
    const names = EVENT_CATALOG.map((e) => e.name);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) {
      expect(MessageNameSchema.safeParse(name).success, name).toBe(true);
      expect(EventNameSchema.safeParse(name).success, name).toBe(true);
    }
  });

  it('describes every declared event name', () => {
    const catalogued = new Set(EVENT_CATALOG.map((e) => e.name));
    for (const name of Object.values(EVENT_NAMES)) {
      expect(catalogued.has(name), `${name} missing from EVENT_CATALOG`).toBe(true);
    }
  });

  it('validates the step-completed payload against its declared schema', () => {
    const descriptor = EVENT_CATALOG.find((e) => e.name === EVENT_NAMES.STEP_COMPLETED);
    expect(descriptor).toBeDefined();
    const parsed = descriptor!.payload.safeParse(exampleEventEnvelope.payload);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
  });

  it('marks security-relevant events as audited', () => {
    const mustAudit = [
      EVENT_NAMES.SESSION_STATE_CHANGED,
      EVENT_NAMES.APPROVAL_DECIDED,
      EVENT_NAMES.POLICY_DENIED,
      EVENT_NAMES.SCOPE_VIOLATION_BLOCKED,
      EVENT_NAMES.TOOL_CALL_STARTED,
      EVENT_NAMES.MODEL_CALL_COMPLETED,
    ];
    for (const name of mustAudit) {
      expect(EVENT_CATALOG.find((e) => e.name === name)?.audited, name).toBe(true);
    }
  });

  it('every engine name is a legal address', () => {
    for (const engine of EngineNameSchema.options) {
      expect(AddressSchema.safeParse(engine).success, engine).toBe(true);
    }
  });
});
