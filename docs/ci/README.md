# CI

`github-actions-ci.yml.example` is the intended pipeline for this repository.
It is kept here rather than in `.github/workflows/` because the automation
account that opened the Phase 0 pull request does not hold the `workflows`
permission; a maintainer can enable it with:

```bash
mkdir -p .github/workflows
cp docs/ci/github-actions-ci.yml.example .github/workflows/ci.yml
```

The pipeline runs, on Node 20 and 22:

| Step | Command | Why |
| --- | --- | --- |
| Type-check | `npm run typecheck` | Contracts and typed examples must compile |
| Artifact freshness | `npm run schemas:check -w @aiptc/contracts` | Committed JSON Schemas and samples must match the Zod source of truth (ADR-0002) |
| Test | `npm test` | Conformance, registry, messaging, lifecycle and no-engine-logic suites |
| Build | `npm run build` | `dist/` must emit cleanly for downstream packages |

Locally, `npm run verify` runs the same checks in one shot.
