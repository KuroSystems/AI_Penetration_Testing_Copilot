# ADR-0008: Plugins declare capabilities; the host grants them, structurally

- **Status**: accepted
- **Date**: 2026-07-30
- **Phase**: 0 — Architecture & Contracts Foundation
- **Deciders**: Core maintainers

## Context

The interesting functionality of a pentest copilot — nmap, ffuf, sqlmap
wrappers, cloud auditors, custom client tooling — will arrive as plugins. Plugins
are third-party code running on a machine that holds an engagement's most
sensitive data, pointed at systems where a mistake is a legal incident.

Two things follow. First, a plugin must not be able to do anything it did not
declare. Second, the *user* must be able to see, before installing, exactly what
it wants to do: which binaries it runs, which hosts it can reach, whether it can
call a model, whether it can write findings.

We also want plugins to contribute tools that the model can call. If tool
declarations were separate from the manifest, the model gateway and the plugin
host would drift apart on what a tool's arguments look like.

## Decision

`PluginManifest` (`packages/contracts/src/plugin/manifest.ts`) is a complete,
declarative description; the host is the only thing that can turn a declaration
into an ability.

- **Permissions are explicit and default-deny**: `network`
  (`none | scope-targets | allowlist | any`), `filesystem`, `process`
  (allow-listed binaries), `environment`, `model` (may it call an LLM at all,
  local-only?), `storage` (which collections, read/write), `events` (which topics
  it may subscribe to), `engineCalls` (which operations it may invoke), plus a
  `maxSensitivity` ceiling. `permissions` is a **required** field: silence must
  never mean "allow".
- **`network: 'scope-targets'`** is the intended default for scanners: the host
  resolves it against the live session scope, so a plugin cannot scan a host the
  engagement does not cover even if it wanted to.
- **Enforcement is structural, not advisory.** The host builds `PluginContext`
  from the *granted* permissions (`packages/contracts/src/plugin/host.ts`); a
  plugin that was not granted model access simply has no way to reach a model.
  There is no ambient global to fall back on.
- **Tools are declared in the manifest** with JSON Schema input/output, plus
  `readOnly`, `idempotent`, `activityClasses`, `requiresApproval`, `costHint` and
  a timeout. The model gateway converts the same declaration into provider tool
  definitions, so there is exactly one description of a tool.
- **Runtime kinds are enumerated and sandbox-aware**: `in-process` (reserved for
  signed first-party code), `worker-thread`, `child-process`, `wasm`,
  `container`, `mcp-server`. Resource limits (memory, CPU, wall clock,
  concurrency, output size) are part of the manifest.
- **Supply chain fields are first-class**: `integrity` digest, `signature`, and
  a host-assigned `trust` tier (`first-party | verified | community | untrusted`).
- **Compatibility is declared**: `contractsRange` (required) and `hostRange`
  gate loading (ADR-0010).
- **Safety posture is declared**: total activity classes, `advisoryOnly`,
  `requiresApprovalOnActivate`, and a list of known destructive operations a
  reviewer must acknowledge.
- **`InstalledPlugin`** records what was actually granted, separately from what
  was requested — the two are allowed to differ, and the difference is auditable.

## Consequences

### Positive

- A user can read a manifest and know the blast radius.
- Least privilege is the default, and violations are impossible rather than
  merely detectable.
- One tool declaration serves the plugin host, the model gateway, the planner's
  cost estimates and the approval UI.
- `dry-run` sessions are honoured because `ToolInvocationContext.dryRun` is part
  of the contract, not a convention.

### Negative / costs

- More work for plugin authors than "export a function".
- The host must actually implement enforcement per runtime kind; the manifest
  alone guarantees nothing. `in-process` plugins can only ever be
  policy-enforced, which is why the trust tier exists.

### Neutral

- MCP servers are supported as a runtime kind, so the ecosystem of existing MCP
  tools is reachable without changing the contract.

## Alternatives considered

| Option | Why not |
| ------ | ------- |
| Trust-by-default plugins (npm-style) | Unacceptable blast radius for a tool holding engagement data and pointed at client infrastructure. |
| Permissions inferred from code analysis | Unsound in a dynamic language; unreadable for users. |
| Tools registered imperatively at activation | The host could not show or gate capabilities before running the plugin's code. |
| Single sandbox for everything | Different plugins have legitimately different needs (a WASM parser vs. an nmap wrapper); enumerating runtime kinds keeps each honest. |

## Compliance

- `permissions` and `contractsRange` are required by the schema; negative
  fixtures in `test/fixtures/invalid.ts` prove a manifest without them is
  rejected.
- `PluginContext` exposes no ambient capability: every reachable collaborator is
  a property the host had to construct.
- Later phases: the host must never pass a raw `fetch`, `fs` or `child_process`
  handle into a plugin.
