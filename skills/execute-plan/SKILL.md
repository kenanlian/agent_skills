---
name: execute-plan
description: Execute a saved self-contained plan through its work-package DAG with bounded subagent delegation, persistent execution state, per-wave verification, integration, and user-selected conformance and patch review through completion.
---

# Execute plan

<critical>
Before implementation work or codebase exploration, read the exact plan file supplied for this task.

- Treat the saved plan as the semantic source of truth. Visible, summarized, or compressed conversation is secondary.
- If the path is unknown, missing, or unreadable, stop and request the exact path. Do not guess, search for a likely plan, or reconstruct it from conversation.
- Never silently redesign a load-bearing behavior, interface, data, compatibility, security, or rollout decision.
- Continue until every package, verification step, and user-selected review gate is complete unless a genuine blocker needs user information or authority.
</critical>

## Preflight the plan and repository

Read the complete plan, including its baseline, contracts, DAG, work packages, contingencies, and verification. Before editing:

1. Inspect the current commit, working tree, task-relevant dependency versions, and all load-bearing baseline anchors.
2. Preserve unrelated user changes. Compare task-relevant changes with the plan baseline.
3. Treat a change to a promised behavior, shared interface, owned file, schema, dependency assumption, test entry point, or integration anchor as material drift. Execute the plan's contingency when it covers the drift; otherwise stop with evidence and request a plan revision or user decision.
4. Treat unrelated dirty files or non-semantic changes outside package ownership as non-material and continue without modifying them.
5. Normalize the plan into `R*` requirements, `C*` contracts, `WP-*` nodes, `V*` checks, ownership, and verified dependency outputs. If a large plan lacks enough information to schedule safely, do not invent a DAG; report the exact planning gap.

## Create or resume persistent execution state

Every execution has a durable state file in the plan's `.dev/plan/` directory. Derive `<slug>` by removing `.md` and then a final `-plan` from the plan basename. Compute the complete plan file's SHA-256. Name a new state file `.dev/plan/<slug>-execution-YYYYMMDD-HHmmss.md` using host-local time.

Before creating a file, list matching `<slug>-execution-*.md` files:

- If exactly one state with the same plan path and SHA-256 is `in-progress`, `awaiting-review-choice`, `fixing-review-findings`, or `blocked`, read it completely, verify its recorded repository state and completed package checks, then resume it.
- If more than one matching active state exists, stop and report every path; do not guess which execution owns the workspace.
- If only completed states match, verify the recorded final state against the current repository. If the contracts still hold, report that this exact plan was already completed rather than executing it again. If they no longer hold, treat that as material drift and request a plan revision instead of blindly replaying old edits.
- If no active state matches, create a new timestamped state. A changed plan SHA-256 always starts a new state and never overwrites or deletes older records. If the timestamped path already exists, advance to a later unused timestamp before writing.

Create the state after capturing the pre-execution working tree so the state file itself is recognized as expected. Keep the plan immutable during execution. Use this structure and update it immediately after every transition:

```markdown
# Execution state: <plan title>

Plan: `<exact path>`
Plan SHA-256: `<digest>`
Started: `<timestamp>`
Updated: `<timestamp>`
Status: `in-progress | awaiting-review-choice | fixing-review-findings | blocked | completed`

## Baseline

- Commit: `<sha>`
- Relevant pre-existing changes: `<paths and ownership notes, or None>`
- Drift decision: `<result and evidence>`

## Work packages

| ID | Status | Executor | Changed files | Focused verification |
| --- | --- | --- | --- | --- |
| WP-01 | pending | — | — | — |

Package status is one of `pending`, `in-progress`, `verified`, or `blocked`.

## Deviations and blockers

- `<confirmed plan deviation, corrective work, blocker, or None>`

## Integration and final verification

- `<command or check → observed result, or Pending>`

## Review gate

- User choice: `<both | conformance-only | patch-only | skip | pending>`
- Conformance review: `<result, findings, and rerun status, or Not selected>`
- Patch review: `<result, findings, and rerun status, or Not selected>`

## Completion

- `<final observable outcome and residual limitation, or Pending>`
```

The state file is an audit and recovery artifact. Mark it `completed` and keep it permanently; never delete, rename, or overwrite a prior execution record.

## Track and schedule the DAG

When a todo tool is available, mirror the plan packages and final verification there while treating the state file as the durable source for recovery. Keep one main-owned coordination item active; several ready delegated packages may run concurrently.

A package is ready only when all predecessors are `verified`, their handoff outputs match the plan, its shared interfaces are stable, and no active package overlaps its write ownership. Schedule by waves:

1. Stabilize contract, schema, or shared-interface packages before consumers.
2. Release every independent ready package whose ownership does not overlap.
3. After the wave, collect results, inspect actual diffs, verify contract compliance and focused checks, and update each package to `verified` or `blocked`.
4. Release dependent packages only after the checkpoint passes.
5. Keep cross-package integration and final verification with the main agent.

`Delegation: preferred` means dispatch a bounded subagent even when the node is serial. `allowed` lets the main agent execute a small package when handoff overhead is greater. `main-required` stays with the main agent. Never equate serial dependency with main-agent ownership.

Follow `delegate-work` for every subagent. Give it only the relevant shared contracts, its complete `WP-*`, direct verified dependency outputs, exact ownership, focused verification, and required domain skill or `None`. Do not pass the full parent conversation or unrelated packages. The same subagent owns local implementation and focused tests; resume it for corrections or a cohesive follow-up instead of rebuilding its context in a replacement.

If a subagent changes scope, shared interfaces, or files outside ownership, do not accept the result. Revert nothing blindly: inspect the shared working tree, preserve unrelated changes, and resume the same agent with the exact violation and required correction. If safe separation is no longer possible, serialize the work under main-agent control.

## Verify packages and integration

For each package:

- inspect every changed hunk in context and confirm the promised `C*` behavior and prohibited paths;
- run the plan's focused `V*` checks plus the smallest objective check needed for the actual edit;
- diagnose and fix failures within the package scope, then rerun them before marking `verified`;
- record changed files, executor, observed commands, deviations, and handoff outputs in the state file; and
- never release a consumer based only on a subagent completion claim.

After all packages are verified, run the plan's integration and end-to-end checks. Confirm every `R → C → WP → V` path and the requested observable behavior. Record complete commands and observed results. Do not claim success from build, typecheck, or an existing suite alone when the plan promises new behavior.

## Offer post-execution reviews

After implementation and final verification pass, set state to `awaiting-review-choice`. Honor a review preference already stated by the user. Otherwise use the host's available user-input mechanism to offer exactly `both`, `conformance only`, `patch only`, or `skip`, with a recommendation based on the executed change:

- recommend conformance review for multiple contracts or packages, refactors, migrations, compatibility work, or any plan deviation;
- recommend patch review for non-trivial code, public interfaces, security or authorization, data handling, concurrency, cleanup, or external effects;
- recommend both when either category is high risk; and
- permit a skip recommendation only for a small, low-risk, directly verified change.

If both are selected, follow `delegate-work` and launch independent read-only reviewers concurrently:

- `review-plan-conformance` receives the exact plan path, execution diff/workspace, and no implementation authority;
- `review-patch` receives the exact diff/workspace and intended behavior, and hunts defects beyond plan conformance.

The main agent validates every reported violation or finding against the repository. Set state to `fixing-review-findings`, automatically fix confirmed findings that stay within the authorized plan, rerun affected focused checks and the complete final verification, then repeat every selected review until conformance is `CONFORMS` and patch review is `correct`. Keep one review selected if the other was not requested.

Ask the user before any correction that expands scope, changes product or architecture decisions, needs new authority, or introduces an additional external effect. Record `unverifiable` contracts and external limitations; if they prevent the selected gate from reaching a truthful pass, stop for user direction rather than downgrading the verdict.

If reviews are skipped, record `skip`. Mark the state `completed` only after the user-selected review path is closed. Report the implemented outcome, state-file path, focused and final verification results, review choice and verdicts, and any residual limitation.
