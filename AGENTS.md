# Repository Guidelines

## Project Structure & Module Organization

This repository contains platform-neutral agent skills. Each skill lives in
`skills/<skill-name>/` and is anchored by a `SKILL.md` file; keep its supporting
material nearby in `references/`, `agents/`, `assets/`, or
`starter-components/` as appropriate. The largest skill, `skills/baoyu-design/`,
contains reusable design references plus executable helpers in `agents/`.
Its shared Node tests are in `skills/baoyu-design/agents/tests/`; generator
packages have their own sources under `agents/gen-pptx/src/` and
`agents/gen-video/src/`. Shared workflow infrastructure may also expose small
executable helpers inside its own skill, such as
`skills/audit-persistence/agents/persist.mjs`.

## Development & Verification Commands

There is no repository-wide build command. Run focused checks for the files you
change:

```bash
# Audit persistence helper
node --test 'skills/audit-persistence/agents/tests/*.test.mjs'

# Shared baoyu-design agent tests, from the repository root
node --test 'skills/baoyu-design/agents/tests/*.test.mjs'

# PPTX generator checks
cd skills/baoyu-design/agents/gen-pptx
npm test && npm run typecheck && npm run build

# Video generator checks
cd skills/baoyu-design/agents/gen-video
npm test && npm run typecheck && npm run build
```

Install dependencies in the relevant generator directory before running its
commands. Do not add generated `dist/` output unless the change explicitly
requires checked-in artifacts.

## Writing, Coding & Naming Conventions

Write `SKILL.md` files as concise, actionable Markdown. Use lowercase,
hyphenated skill directory names (for example, `review-plan-conformance`) and
descriptive, lowercase filenames for references. Preserve the language already
used by the edited document; the root README is Chinese.

For JavaScript modules, follow the surrounding ESM style: two-space indentation,
single quotes, semicolons, and `camelCase` identifiers. Use `.mjs` for Node ESM
scripts and `.test.mjs` for their tests. For TypeScript, retain strict typing and
run `npm run typecheck`; no repository-wide formatter or linter is configured.

## Testing Guidelines

Add or update focused tests alongside behavior changes. Name tests after the
module or behavior they cover, such as `asset-store.test.mjs`. Exercise normal
and failure paths where relevant. Documentation-only skill updates should be
checked for correct relative links, command paths, and consistency with the
current workflow.

## Commit & Pull Request Guidelines

Recent history uses short, imperative summaries (for example, `Migrate agent
definitions and add execute-plan skill`). Keep commits narrowly scoped and avoid
unrelated formatting changes. Pull requests should explain the user-facing
workflow change, list affected skills or packages, link related issues when
available, and report the verification commands run. Include screenshots only
when a visual asset, rendered preview, or UI-facing output changes.
