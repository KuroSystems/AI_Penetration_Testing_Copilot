# ADR-0012: Authorisation, scope and safety live in the contracts, default-deny

- **Status**: accepted
- **Date**: 2026-07-30
- **Phase**: 0 — Architecture & Contracts Foundation
- **Deciders**: Core maintainers

## Context

This is a tool that attacks computers. The difference between a penetration test
and a crime is authorisation and scope. If those concepts are implemented in a
policy engine in some later phase, then every engine written before it will have
been designed without a place to put them, and safety will be retrofitted — the
one thing that never works.

An AI copilot sharpens the problem: a model can propose an action against a host
nobody scoped, hallucinate a target, or be talked into it by content it read on
a target system (prompt injection). Guardrails have to be structural.

## Decision

Safety primitives are part of Phase 0's contracts, even though the policy engine
that evaluates them arrives later.

1. **Authorisation is a record, not a checkbox.** `AuthorizationRecord` captures
   method, who granted it, who attested it inside the tool, a validity window,
   a document reference/hash and revocation. `Session.authorizationId` is
   optional *only* in `draft`; every other state requires one. A session cannot
   legitimately reach `running` without provable, in-date authorisation.
2. **Scope is default-deny and deny-first.** `EngagementScope.rules` is an
   ordered list of include/exclude rules; any matching `exclude` wins, and a
   target matching no rule is **out of scope**. There is no implicit allow.
3. **Rules of engagement are machine-readable.** `RulesOfEngagement` declares
   allowed and forbidden `ActivityClass`es, testing windows, rate and
   concurrency ceilings, which classes require human approval, whether target
   data may leave the machine (`allowRemoteModelEgress`) and how data is handled.
4. **Every action declares its activity class.** Tools
   (`ToolDefinition.activityClasses`), prompt modules
   (`PromptModule.safety.activityClasses`), plugins
   (`PluginManifest.safety.activityClasses`) and steps
   (`SessionStep.activityClass`) all speak the same vocabulary, so "is this
   allowed?" is a set-membership test against the ROE rather than a judgement.
5. **Human gates are modelled** (`ApprovalRequest`), with expiry, risk level, the
   steps they block, and the decision recorded.
6. **Autonomy is explicit** (ADR-0005), including `dry-run`, and
   `ToolInvocationContext.dryRun` is contractual so tools cannot ignore it.
7. **Egress is controlled by data, not by convention**: `Sensitivity` on
   payloads and messages, `maxSensitivity` on models, tools and plugins,
   `requireLocalOnly` on the session's model policy (ADR-0009, ADR-0011).
8. **Untrusted input is labelled at the prompt boundary**
   (`PromptVariable.trust` + `sanitizer`), so target-controlled text cannot be
   interpolated as if it were instructions (ADR-0006).
9. **Denials are observable**: `policy.decision.denied` and
   `policy.scope.violation-blocked` are catalogued, audited events carrying the
   matched rules, so refusals are explainable and provable after the fact.
10. **`out_of_scope`, `policy_violation`, `approval_required` and
    `safety_refusal` are first-class error codes**, so a refusal is never
    confused with a bug.

## Consequences

### Positive

- Every later engine has an obvious place to put a safety check, and no excuse
  not to.
- A report can prove which activities were authorised, when, by whom, and that
  out-of-scope attempts were blocked.
- Prompt-injection defence and egress control are structural properties rather
  than reminders in a code review.

### Negative / costs

- More required fields up front; creating a session is more ceremony than
  "give me a chat window".
- Default-deny will occasionally block legitimate work until the scope is
  edited. That is the correct direction to fail.
- Matching semantics for scope patterns are not defined here — only the shape.
  The policy engine must specify them precisely, and until it does, no engine
  may implement its own ad-hoc matcher.

### Neutral

- The copilot does not verify signatures on authorisation documents in Phase 0;
  it guarantees the record exists, is in-date and is auditable.

## Alternatives considered

| Option | Why not |
| ------ | ------- |
| Add safety in the policy-engine phase | Every engine built before it would lack the fields to check, and retrofitted safety leaves gaps. |
| Allow-by-default with a blocklist | One forgotten exclusion is an unauthorised access. Default-deny fails safe. |
| Free-text rules of engagement only | Unenforceable by software; humans skim. Machine-readable ROE plus a free-text `notes` field gets both. |
| Trust the model to stay in scope | Models hallucinate and can be injected by the very systems under test. |

## Compliance

- Schema level: `EngagementScope.rules` requires at least one rule (negative
  fixture `Session / empty-scope-rules`); `RulesOfEngagement.allowedActivities`
  requires at least one class; `PluginManifest.permissions` is mandatory.
- Event level: `POLICY_DENIED` and `SCOPE_VIOLATION_BLOCKED` are marked
  `audited` in `EVENT_CATALOG`, asserted by `test/messaging.test.ts`.
- Later phases: no engine may execute an activity class absent from the
  session's `rulesOfEngagement.allowedActivities`, and none may run against a
  target that the policy engine has not confirmed in scope.
