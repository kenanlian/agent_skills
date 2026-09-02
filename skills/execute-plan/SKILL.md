---
name: execute-plan
description: Execute a saved self-contained plan through its work-package DAG with bounded subagent delegation, persistent execution state, per-wave acceptance, integration, and user-selected conformance and patch review through completion.
disable-model-invocation: true
---

# Execute plan

<critical>
Before implementation work or codebase exploration, read the exact plan file supplied for this task.

- Treat the saved plan as the semantic source of truth. Conversation summaries are secondary.
- If the path is unknown, missing, or unreadable, stop and request the exact path. Do not guess or reconstruct it.
- Never silently redesign a load-bearing behavior, interface, data, compatibility, security, or rollout decision.
- Continue until every package, verification step, and user-selected review gate is complete unless a genuine blocker needs user information or authority.
- Use `audit-persistence` for mechanical audit/state mutation. Do not reread and rewrite large state, manifest, snapshot, or raw-review files when a deterministic helper operation can update them.
</critical>

## Preflight the plan and repository

Read the complete plan, including baseline, contracts, DAG, work packages, contingencies, and verification. Before editing:

1. Inspect current commit, working tree, task-relevant dependency versions, and all load-bearing baseline anchors.
2. Preserve unrelated user changes. Compare task-relevant state with the plan baseline.
3. Treat a change to promised behavior, shared interface, schema, dependency assumption, security/data boundary, package ownership, or material verification path as material drift. Execute the plan contingency when it covers the drift; otherwise stop with evidence and request plan revision or user direction.
4. Treat unrelated dirty files, shifted line anchors, local helper/import changes, mechanically affected fixtures, and other non-semantic drift as non-material when they do not alter a contract or coordination boundary.
5. Normalize the plan into `R*`, `C*`, `WP-*`, `V*`, ownership, and verified dependency outputs. If the plan lacks enough information to schedule safely, report the exact planning gap rather than inventing a DAG.

## Persistent execution state

Every execution has a durable state file in the plan's `.dev/plan/` directory. Derive `<slug>` by removing `.md` and then a final `-plan` from the plan basename. Compute the complete plan SHA-256. New state path:

```text
.dev/plan/<slug>-execution-YYYYMMDD-HHmmss.md
```

Before creating it, list matching states:

- If exactly one state with the same plan path and SHA-256 is active (`in-progress`, `awaiting-review-choice`, `fixing-review-findings`, `awaiting-review-decision`, or `blocked`), read it completely once, verify recorded repository state and completed package checks, then resume it.
- If more than one matching active state exists, stop and report all paths.
- If only completed states match, verify current contracts still hold. Report already-completed when they do; treat later material drift as requiring plan revision.
- If none matches, create a new timestamped state. A changed plan SHA-256 always starts a new state and never overwrites older records.

Create the state after capturing the pre-execution working tree so the state file itself is recognized as expected. Keep the plan immutable during execution.

Use this canonical structure:

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

## Deviations and blockers

- None

## Integration and final verification

- Pending

## Review gate

- User choice: pending
- Review artifact directory: Not created
- Review cycle: Not selected
- Conformance review: Not selected
- Patch review: Not selected

## Completion

- Pending
```

The state file is an audit and recovery artifact. Keep it permanently and never rename or delete it.

### State ownership and serialization

The execution agent owns all semantic execution records: drift decisions, package status judgments, blockers, deviations, corrective actions, verification interpretations, user decisions, review-gate decisions, and completion claims. `audit-persistence` owns how those records are serialized into the existing state file.

After initialization, do not repeatedly load the entire state merely to edit it. Prefer narrow helper operations:

- `set-field` for `Status` and `Updated`;
- `upsert-table-row` for a `WP-*` row;
- `append-section` for a newly reasoned deviation, blocker, corrective action, or user decision;
- `replace-section` or `append-section` for integration/final-verification records;
- `set-list-item` for review-gate fields.

A helper must never invent semantic content. The execution agent supplies the exact concise record to serialize. If a complex transition requires reading existing state for reasoning, read the relevant section; do not rewrite unrelated sections through model output.

## Track and schedule the DAG

When a todo tool is available, mirror plan packages there while treating the state file as durable recovery state. A package is ready only when all predecessors are verified, handoff outputs match the plan, shared interfaces are stable, and no active package overlaps write ownership.

Schedule by waves:

1. Stabilize contract/schema/shared-interface packages before consumers.
2. Release every independent ready package whose ownership does not overlap.
3. After the wave, collect worker results and perform a lightweight acceptance gate for each package: confirm scope/ownership, required handoff outputs, focused-verification evidence, and absence of material drift. Do not duplicate patch-level correctness review or full plan-conformance analysis here. Record each package as `verified` or `blocked` through the helper.
4. Release dependent packages only after the acceptance gate passes.
5. Keep cross-package integration and final verification with the main execution agent.

`Delegation: preferred` means dispatch a bounded subagent even when serial. `allowed` permits direct main-agent execution when dispatch overhead exceeds value. `main-required` remains with the coordinator.

Follow `delegate-work` for every subagent. Give only relevant shared contracts, the complete current `WP-*`, direct verified dependency outputs, exact ownership, focused verification, and required domain skill or `None`. Do not pass the full parent conversation or unrelated packages. Resume the same subagent for corrections when possible.

If a worker changes scope, shared interfaces, or files outside ownership, do not accept the result. Confirm the violation from the changed-file set and only the necessary diff context, preserve unrelated changes, and resume the same agent with the exact violation. If safe separation is no longer possible, serialize the work under main-agent control.

## Accept packages and verify integration

For each package, the main execution agent performs an acceptance gate rather than a second full code review:

- confirm the actual changed-file set stays within package ownership and that no shared interface, schema, contract boundary, or unrelated file was changed without authorization; inspect only the diff context needed to resolve those questions, not every changed hunk by default;
- confirm the worker produced the handoff outputs required by the plan and that direct consumers have the dependency information they need;
- confirm the worker reports the plan's focused `V*` commands and observed results. Rerun a focused check only when the plan requires coordinator-side verification, evidence is missing or ambiguous, a shared/load-bearing boundary changed, or a concrete risk/failure warrants independent confirmation;
- inspect reported deviations, blockers, and material drift. If acceptance fails, resume the same worker for correction when possible rather than independently re-reviewing and repairing the whole package;
- record executor, changed files, focused-verification evidence, deviations, and handoff outputs through narrow state-helper operations; and
- never release a consumer based only on a subagent completion claim.

A package marked `verified` has passed this dependency-release acceptance gate; it does not mean the main execution agent independently proved every changed hunk correct or performed full plan-conformance analysis. Patch-level defect hunting belongs to `review-patch`, and complete plan-contract coverage belongs to `review-plan-conformance` when those review gates are selected.

After all packages are verified, run the plan's integration and end-to-end checks. Confirm every `R → C → WP → V` path and requested observable behavior. Record complete commands and observed results. Build/typecheck alone is insufficient when new behavior is promised.

## Classify execution discoveries

Before acting on a material risk, classify it:

- **`autonomous-fix`:** the plan or established contract already determines correct behavior and the correction stays within authorized scope. Fix, verify, and record the decision and evidence.
- **`verification-escalation`:** behavior is settled but risk warrants stronger proof. Add the smallest meaningful negative/failure/repetition/concurrency/compatibility check and record why.
- **`decision-escalation`:** multiple reasonable corrections change user behavior, public interfaces, data, security, compatibility, failure semantics, rollout, authority, or external effects. Pause affected work and ask the user with evidence, impact, options, and recommendation.

These records are semantic content owned by the execution agent. Serialize them into `## Deviations and blockers` without reproducing the rest of the state file.

## Offer post-execution reviews

After implementation and final verification pass, set state to `awaiting-review-choice`. Honor a review preference already stated by the user. Otherwise offer exactly `both`, `conformance only`, `patch only`, or `skip` and recommend based on risk:

- conformance for multiple contracts/packages, refactors, migrations, compatibility, or plan deviation;
- patch review for non-trivial code, public interfaces, security/authorization, data handling, concurrency, cleanup, or external effects;
- both when either category is high risk;
- skip only for a small low-risk directly verified change.

If skipped, record `skip`, create no review directory, and complete only after the selected path is closed.

## Execution-review persistence ownership

When at least one review is selected, derive `<execution-id>` from the execution-state basename and create:

```text
.dev/review/<execution-id>/
```

Use `audit-persistence` for directory/file initialization and mutable manifest/state bookkeeping.

Ownership is strict:

- **Execution agent:** adjudication, review-driven fix decisions, user escalation, and execution-state semantic records.
- **Audit helper:** manifest serialization, timestamps/hashes/paths, review-cycle fields, and other mechanical bookkeeping.
- **`review-patch` agent:** its complete immutable `round-NN-review-patch.md` raw report.
- **`review-plan-conformance` agent:** its complete immutable `round-NN-plan-conformance.md` raw report.

Do **not** create a reviewed-patch snapshot. For current audit requirements, record repository `HEAD`, review scope, and diff base/head metadata only. A worktree review may not be exactly reconstructible later; that precision is intentionally out of scope.

The execution agent must never receive full raw reviewer output merely so it can reproduce it into a file. Reviewers write their own artifacts and return compact control results.

## Review manifest

Create `manifest.md` once before round 1:

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
gate_outcome: pending
final_patch_verdict: <correct | incorrect | not-selected | pending>
final_conformance_verdict: <CONFORMS | DIVERGES | INCOMPLETE | not-selected | pending>
---

# Review manifest

## Reviewer provenance

- execute-plan skill SHA-256: `<digest or unknown>`
- review-patch skill SHA-256: `<digest, unknown, or not-selected>`
- review-plan-conformance skill SHA-256: `<digest, unknown, or not-selected>`
- main-agent model: `<host-reported identifier or unknown>`
- main-agent reasoning configuration: `<host-reported value or unknown>`

## Rounds

- Pending

## Final summary

- Pending
```

Use helper frontmatter/section operations for subsequent updates. Do not reread and rewrite the whole manifest after every round.

## Run one execution-review round

For round `N` from 1 through 3:

1. Allocate the next integer round.
2. Record current `HEAD`, review scope (`workspace | commit-range | workspace-and-commits`), and applicable `diff_base`/`diff_head`. Do not snapshot the patch.
3. When patch review is selected, dispatch via `delegate-work` with `Required skill: review-patch`, the exact implementation scope and intended behavior, round/repository metadata, and `Raw Review Artifact: .dev/review/<execution-id>/round-NN-review-patch.md`.
4. When conformance review is selected, dispatch with `Required skill: review-plan-conformance`, exact plan path plus implementation scope, round/repository metadata, and `Raw Review Artifact: .dev/review/<execution-id>/round-NN-plan-conformance.md`.
5. When both are selected, launch them independently and concurrently. Each reviewer is source/worktree read-only with exclusive audit-write permission only for its own raw artifact path.
6. Each reviewer must persist its full report before returning. A return without the required artifact is incomplete and does not consume the round.
7. Accept only compact control results:
   - patch: verdict/confidence/artifact plus every `RP-*` ID, priority, category, one-line summary;
   - conformance: verdict/confidence/artifact plus every violated contract ID/type/one-line summary and aggregate coverage counts.
8. Do not load full satisfied-contract coverage or full finding prose into the parent context. Read only specific raw-artifact sections needed to adjudicate a reported issue.
9. After all selected reviewers have returned, independently validate every patch finding and conformance violation and write `round-NN-adjudication.md` before fixes.

## Adjudication

Adjudication is new execution-agent reasoning, so it remains owned by the execution agent rather than the helper or reviewer. Include one entry for every reported `RP-*` finding and every `violated` conformance contract:

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

Do not copy the full raw reviewer prose into adjudication. Reviewer claims remain in immutable raw artifacts; adjudication records the execution agent's classification and resolution.

Update the review manifest after each round through helper operations with raw artifact paths, adjudication path, verdicts/confidence, repository metadata, and compact counts. Update execution-state review-gate fields through `set-list-item` rather than whole-file rewriting.

## Fix and rerun

One review cycle permits at most three completed rounds. When both reviews are selected, both reports belong to the same round. Never dispatch round 4.

For rounds 1 and 2:

- if adjudication leaves no confirmed material finding, set `gate_outcome: passed` and close;
- otherwise set execution state to `fixing-review-findings`, automatically fix confirmed material findings that stay within the authorized plan, rerun focused/final verification, update resolution evidence, then start the next round;
- do not fix P3 advisories merely to close the gate and never rerun solely for them;
- ask the user before any correction that changes product/architecture decisions, expands scope, needs new authority, or adds an external effect.

After round 3, persist and adjudicate every selected report. If no confirmed material finding remains, close as passed. If any confirmed P0–P2 patch finding or material conformance violation remains, do not auto-fix and do not rerun. Set state to `awaiting-review-decision`, set manifest `gate_outcome: awaiting-user-decision`, `cycle_status: max-rounds-escalated`, `completion_reason: max-rounds`, and ask the user for direction.

A user-authorized substantively revised new cycle uses a new `.dev/review/<execution-id>-retry-YYYYMMDD-HHmmss/` directory, starts at round 1, links the prior directory, and gets its own three-round maximum. Do not create it merely to retry an unchanged third-round state.

When resuming `awaiting-review-decision`, record the user's exact choice as semantic execution-state content before acting. If the user authorizes an in-scope fix without independent rereview, fix and verify it, record the residual limitation, and complete. If the user accepts risk, record it and complete with that limitation. If the user requests a revised plan, remain blocked. If the user stops, record that the selected gate did not pass.

## Complete

Mark the execution state `completed` only after all work packages, final verification, and the user-selected review path are truthfully closed. Report implemented outcome, state-file path, review directory when one exists, focused/final verification, review choice/final verdicts, and residual limitations.