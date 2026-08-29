---
name: execute-plan
description: Execute a saved self-contained plan through its work-package DAG with bounded subagent delegation, persistent execution state, per-wave verification, integration, and user-selected conformance and patch review through completion.
disable-model-invocation: true
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
3. Treat a change to a promised behavior, shared interface, schema, dependency assumption, security/data boundary, package ownership, or material verification path as material drift. Execute the plan's contingency when it covers the drift; otherwise stop with evidence and request a plan revision or user decision.
4. Treat unrelated dirty files, shifted line anchors, local import/helper changes, mechanically affected fixtures, and other non-semantic changes as non-material when they do not alter a contract or coordination boundary. Adapt locally and continue without modifying unrelated work.
5. Normalize the plan into `R*` requirements, `C*` contracts, `WP-*` nodes, `V*` checks, ownership, and verified dependency outputs. If a large plan lacks enough information to schedule safely, do not invent a DAG; report the exact planning gap.

## Create or resume persistent execution state

Every execution has a durable state file in the plan's `.dev/plan/` directory. Derive `<slug>` by removing `.md` and then a final `-plan` from the plan basename. Compute the complete plan file's SHA-256. Name a new state file `.dev/plan/<slug>-execution-YYYYMMDD-HHmmss.md` using host-local time.

Before creating a file, list matching `<slug>-execution-*.md` files:

- If exactly one state with the same plan path and SHA-256 is `in-progress`, `awaiting-review-choice`, `fixing-review-findings`, `awaiting-review-decision`, or `blocked`, read it completely, verify its recorded repository state and completed package checks, then resume it. An `awaiting-review-decision` state must remain paused until the user provides the recorded decision; never convert it into an automatic fourth review round.
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
Status: `in-progress | awaiting-review-choice | fixing-review-findings | awaiting-review-decision | blocked | completed`

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
- Review artifact directory: `<path, Not created, or Not selected>`
- Review cycle: `<cycle identifier, round N of 3, status active | passed | max-rounds-escalated | stopped-by-user, or Not selected>`
- Conformance review: `<latest verdict, round, and rerun status, or Not selected>`
- Patch review: `<latest verdict, round, and rerun status, or Not selected>`

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

## Classify execution discoveries

Classify a material risk before deciding whether to continue:

- **`autonomous-fix`:** the plan or established contract already determines the correct behavior, and the correction stays within authorized scope without changing an external contract. Fix it, run focused and final verification, and record it.
- **`verification-escalation`:** behavior is settled but its risk warrants stronger proof. Add the smallest meaningful failure, repetition, concurrency, compatibility, or negative-path check; use fault injection only when a concrete high-impact defect could otherwise escape.
- **`decision-escalation`:** multiple reasonable corrections change user behavior, public interfaces, data, security, compatibility, failure semantics, rollout, authority, or external effects. Pause the affected work, preserve verified results, and ask the user with evidence, impact, options, and a recommendation.

High risk increases verification strength; it does not by itself require user escalation. Escalate when the safe response needs an unmade load-bearing decision or new authority. Ordinary source drift, imports, helper placement, and mechanical fixture closure are not decision escalations.

## Offer post-execution reviews

After implementation and final verification pass, set state to `awaiting-review-choice`. Honor a review preference already stated by the user. Otherwise use the host's available user-input mechanism to offer exactly `both`, `conformance only`, `patch only`, or `skip`, with a recommendation based on the executed change:

- recommend conformance review for multiple contracts or packages, refactors, migrations, compatibility work, or any plan deviation;
- recommend patch review for non-trivial code, public interfaces, security or authorization, data handling, concurrency, cleanup, or external effects;
- recommend both when either category is high risk; and
- permit a skip recommendation only for a small, low-risk, directly verified change.

If both are selected, follow `delegate-work` and launch independent read-only reviewers concurrently:

- `review-plan-conformance` receives the exact plan path, execution diff/workspace, review cycle and round number from 1 through 3, and no implementation or persistence authority;
- `review-patch` receives the exact diff/workspace, intended behavior, review cycle and round number from 1 through 3, and hunts defects beyond plan conformance with no implementation or persistence authority.

If only one review is selected, use the same persistence and adjudication protocol below for that reviewer.

## Persist review evidence

The main agent owns review persistence. Review subagents remain read-only and only return their reports.

When at least one review is selected, derive `<execution-id>` from the execution state basename without `.md`, for example `foo-execution-20260825-173000`. Create `.dev/review/<execution-id>/` and keep it permanently beside the execution state. Never overwrite or delete a prior round.

Create `manifest.md` before the first review round. It is an index and compact aggregate, not a replacement for raw review evidence. Record:

```markdown
---
execution_id: <execution-id>
prior_review_directory: <prior review directory or null>
execution_state: <exact state path>
plan: <exact plan path>
plan_sha256: <digest>
baseline_commit: <sha>
review_choice: <both | conformance-only | patch-only>
started: <timestamp>
completed: <timestamp or null>
rounds: 0
max_rounds: 3
cycle_status: active
completion_reason: pending
gate_outcome: <pending | passed | awaiting-user-decision | user-authorized-no-rereview | user-accepted-risk | stopped>
final_patch_verdict: <correct | incorrect | not-selected | pending>
final_conformance_verdict: <CONFORMS | DIVERGES | INCOMPLETE | not-selected | pending>
---

# Review manifest

## Reviewer provenance

- execute-plan skill SHA-256: `<digest of the exact loaded skill file when accessible, otherwise unknown>`
- review-patch skill SHA-256: `<digest when selected and accessible, otherwise unknown or not-selected>`
- review-plan-conformance skill SHA-256: `<digest when selected and accessible, otherwise unknown or not-selected>`
- main-agent model: `<exact host-reported identifier, or unknown>`
- main-agent reasoning configuration: `<exact host-reported value, or unknown>`

## Rounds

- Pending

## Final summary

- Pending
```

Do not infer unavailable provenance. Prefer a SHA-256 of the exact skill contents loaded for this run over a manually maintained version label. If the host exposes the reviewer subagent's model or reasoning configuration, record those in that review file; otherwise record `unknown`.

For every review invocation, allocate the next integer round and snapshot the reviewed repository state before dispatch: current `HEAD`, whether the review covers committed changes, workspace changes, or both, and the relevant diff base/range when one exists. Use zero-padded filenames:

- `round-01-review-patch.md`
- `round-01-plan-conformance.md`
- `round-01-adjudication.md`
- `round-02-review-patch.md`
- `round-02-plan-conformance.md`
- `round-02-adjudication.md`
- `round-03-review-patch.md`
- `round-03-plan-conformance.md`
- `round-03-adjudication.md`

Create only the reviewer files selected for that execution. A review file must contain provenance plus the reviewer's returned report verbatim so later audits can distinguish what the reviewer actually claimed from what the main agent concluded:

```markdown
---
execution_id: <execution-id>
round: <N>
reviewer: <review-patch | review-plan-conformance>
reviewed_head: <sha>
review_scope: <workspace | commit-range | workspace-and-commits>
diff_base: <sha/ref or null>
diff_head: <sha/ref or WORKTREE>
reviewer_skill_sha256: <digest or unknown>
reviewer_model: <exact host-reported identifier or unknown>
reviewer_reasoning: <exact host-reported value or unknown>
started: <timestamp>
completed: <timestamp>
---

# Raw review

<reviewer return reproduced verbatim>
```

Persist the raw review immediately after each reviewer returns and before fixing anything. If concurrent reviewers return at different times, persist each completed result independently rather than waiting to rewrite them together.

After all selected reviewers for the round have returned, the main agent independently validates every reported patch finding and every conformance violation against the repository. Write `round-NN-adjudication.md` before making review-driven fixes. Use one entry for every reported `RP-*` finding and every `violated` conformance contract:

```markdown
---
execution_id: <execution-id>
round: <N>
adjudicated_at: <timestamp>
head_before_fixes: <sha>
---

# Review adjudication

## Patch findings

### RP-01 — <title>

- Reviewer category: `<category>`
- Reviewer priority: `<P0-P3>`
- Materiality: `<blocking | advisory>`
- Origin: `<implementation | previous-review-fix | pre-existing | other>`
- Status: `<confirmed | rejected | duplicate | out-of-scope | unverifiable>`
- Reason: `<repository-backed adjudication>`
- Evidence: `<file:line or other concrete evidence>`
- Resolution: `<fixed | no-change | needs-user-direction | pending>`
- Fix evidence: `<changed file/check, None, or Pending>`

## Conformance violations

### <contract-id> — <short description>

- Violation type: `<reviewer-provided type>`
- Materiality: `<blocking | advisory>`
- Origin: `<implementation | previous-review-fix | pre-existing | other>`
- Status: `<confirmed | rejected | duplicate | out-of-scope | unverifiable>`
- Reason: `<repository-backed adjudication>`
- Evidence: `<file:line or other concrete evidence>`
- Resolution: `<fixed | no-change | needs-user-direction | pending>`
- Fix evidence: `<changed file/check, None, or Pending>`

## Round summary

- Patch: `<reported N; confirmed material N; confirmed advisory N; introduced by previous review fix N; rejected N; duplicate N; out-of-scope N; unverifiable N>`
- Conformance: `<reported violations N; confirmed material N; confirmed advisory N; introduced by previous review fix N; rejected N; duplicate N; out-of-scope N; unverifiable N>`
```

Record only the immediate origin needed to distinguish implementation defects, pre-existing issues, and defects introduced by a prior review fix. Do not add broader retrospective root-cause or prevention-layer analysis during execution; that belongs to later audit.

For `review-plan-conformance`, preserve the entire raw contract coverage table in its raw review file, including `satisfied`, `satisfied-differently`, and `unverifiable` contracts. The adjudication file only needs entries for reported violations unless the main agent must explicitly resolve another status to close the gate.

Update `manifest.md` after each round by appending one compact round summary with links/paths to its raw review and adjudication files, counts, verdicts, the repository state reviewed, and whether each confirmed issue is material or advisory. Never rewrite raw round evidence to match later fixes. Set `rounds` to the highest completed round, never above 3. Preserve each reviewer's raw final verdict separately from the adjudicated `gate_outcome`. On completion, set final verdicts, `gate_outcome`, `cycle_status`, `completion_reason`, and `completed` in the manifest.

The review directory is an analysis dataset as well as an audit trail. Keep field names and status enums stable across runs so future scripts can aggregate category frequencies, violation types, confirmation rates, repeated-round findings, and reviewer behavior across skill or model versions.

## Adjudicate, fix, and rerun reviews

One execution-review cycle permits at most three completed rounds. A dispatch that produces no reviewer return and no raw review artifact does not consume a round. When both reviews are selected, their concurrent reports belong to the same round. Never dispatch `round-04`.

For rounds 1 and 2, close the gate with `gate_outcome: passed` when adjudication leaves no confirmed material finding, even if a raw verdict rested on a rejected or out-of-scope claim. Otherwise set state to `fixing-review-findings` and automatically fix confirmed material findings that stay within the authorized plan. Rerun affected focused checks and complete final verification, update resolution evidence, then start the next numbered round. Do not fix P3 advisories merely to close the gate, and never rerun solely for them. Ask the user immediately before any correction that changes a product or architecture decision, expands scope, needs new authority, or introduces an additional external effect.

After round 3, persist and adjudicate every report before taking further action. If no confirmed material finding remains, set `gate_outcome: passed` and `cycle_status: passed` and close without another review. This includes P3-only patch findings and raw blocking verdicts whose underlying claims adjudication rejected, marked out of scope, or found unverifiable.

If round 3 still contains any confirmed P0–P2 patch finding or material conformance violation, do not fix it automatically and do not run another reviewer. Set the execution state to `awaiting-review-decision`, set `gate_outcome: awaiting-user-decision`, `cycle_status: max-rounds-escalated`, and `completion_reason: max-rounds`, and ask the user to choose whether to revise the governing decision or plan, authorize a fix without another automatic review, accept the documented risk, stop, or explicitly start a substantively revised new review cycle.

A user-authorized new cycle uses a new `.dev/review/<execution-id>-retry-YYYYMMDD-HHmmss/` directory, starts at round 1, links the prior review directory, and receives its own three-round maximum. Do not create it merely to retry the unchanged third-round tree. Record `unverifiable` material contracts and external limitations; if they prevent a truthful pass, stop for user direction rather than downgrading the verdict.

When resuming `awaiting-review-decision`, persist the user's exact choice before acting. If the user authorizes an in-scope fix without another review, fix it, run focused and final verification, set `gate_outcome: user-authorized-no-rereview`, record the residual lack of independent re-review, and complete the execution. If the user accepts the risk, set `gate_outcome: user-accepted-risk` and complete with that limitation. If the user requests a revised plan, leave execution blocked pending the new plan. If the user stops, set `gate_outcome: stopped` and record that the selected gate did not pass. Only an explicit request for a substantively revised new cycle permits another reviewer dispatch.

If reviews are skipped, record `skip` in the execution state and do not create a review artifact directory. Mark the state `completed` only after the user-selected review path is closed. Report the implemented outcome, state-file path, review-artifact directory when one exists, focused and final verification results, review choice and final verdicts, and any residual limitation.
