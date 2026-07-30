import { describe, expect, it } from 'vitest';
import {
  SESSION_STATE_TRANSITIONS,
  SessionStateSchema,
  TERMINAL_SESSION_STATES,
} from '../src/session/session.js';

/**
 * The transition table is a *contract*, not an implementation detail: the
 * orchestration engine, the UI and the audit verifier all read it. These tests
 * pin the invariants that make it safe to rely on.
 */
describe('session state machine', () => {
  const states = SessionStateSchema.options;

  it('declares transitions for every state', () => {
    for (const state of states) {
      expect(SESSION_STATE_TRANSITIONS[state], state).toBeDefined();
    }
    expect(Object.keys(SESSION_STATE_TRANSITIONS).sort()).toEqual([...states].sort());
  });

  it('only targets known states', () => {
    for (const [from, targets] of Object.entries(SESSION_STATE_TRANSITIONS)) {
      for (const to of targets) {
        expect(states, `${from} -> ${to}`).toContain(to);
      }
    }
  });

  it('never allows a self-transition', () => {
    for (const [from, targets] of Object.entries(SESSION_STATE_TRANSITIONS)) {
      expect(targets, from).not.toContain(from);
    }
  });

  it('makes `archived` the only truly absorbing state', () => {
    expect(SESSION_STATE_TRANSITIONS.archived).toEqual([]);
    for (const state of states) {
      if (state === 'archived') continue;
      expect(SESSION_STATE_TRANSITIONS[state].length, state).toBeGreaterThan(0);
    }
  });

  it('routes every terminal state to `archived`', () => {
    for (const state of TERMINAL_SESSION_STATES) {
      if (state === 'archived') continue;
      expect(SESSION_STATE_TRANSITIONS[state], state).toContain('archived');
    }
  });

  it('keeps every state reachable from `draft`', () => {
    const seen = new Set<string>(['draft']);
    const queue = ['draft'] as (keyof typeof SESSION_STATE_TRANSITIONS)[];
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const next of SESSION_STATE_TRANSITIONS[current]) {
        if (!seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      }
    }
    expect([...seen].sort()).toEqual([...states].sort());
  });

  it('does not allow work to resume from a completed or aborted session', () => {
    expect(SESSION_STATE_TRANSITIONS.completed).not.toContain('running');
    expect(SESSION_STATE_TRANSITIONS.aborted).not.toContain('running');
  });
});
