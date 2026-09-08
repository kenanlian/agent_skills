---
name: execute-plan
description: Execute a saved self-contained plan through its work-package DAG with bounded subagent delegation, persistent execution state, per-wave acceptance, integration, and final verification.
disable-model-invocation: true
---

# Execute plan

<critical>
Before implementation work or codebase exploration, read the exact plan file supplied for this task.

- Treat the saved plan as the semantic source of truth. Conversation summaries are secondary.
- If the path is unknown, missing, or unreadable, stop and request the exact path. Do not guess or reconstruct it.
- Never silently redesign a load-bearing behavior, interface, data, compatibility, security, or rollout decision.
- Continue until every package and verification step is complete unless a genuine blocker needs user information or authority.
- Use `audit-persistence` for mechanical execution-state mutation. Do not reread and rewrite large state or result artifacts when a deterministic helper operation can update them.
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

- If exactly one state with the same plan path and SHA-256 is active (`in-progress` or `blocked`), read that compact state completely once, verify plan path/SHA, restore DAG status from the WP table, read latest result artifacts by pointer when needed, then resume. Do not rebuild old worker conversations.
- If more than one matching active state exists, stop and report all paths.
- If only completed states match, verify current contracts still hold. Report already-completed when they do. Exception: when the same execution session is resumed with an outer-control-plane change request tied to this plan and implementation lineage, reopen the matching state as `in-progress`, apply only authorized corrections, rerun affected focused checks plus final verification, and complete the state again. Treat later material drift or a change that invalidates the plan as requiring plan revision.
- If none matches, create a new timestamped state. A changed plan SHA-256 always starts a new state and never overwrites older records.

Legacy 5-column WP tables (no Attempt / Result artifact columns) continue to completion without mid-run migration. Detect a legacy execution when the resumed WP table lacks those columns. New executions, including a new state after a plan SHA change, use the 6-column schema below. `upsert-table-row` must work for both column counts.

A legacy execution keeps the pre-change control protocol through completion:

- upsert 5-column rows only (`ID | Status | Executor | Changed files | Focused verification`); do not add Attempt or Result artifact columns;
- do not require Result Artifact, attempt allocation, or the compact receipt; workers use the standalone return;
- mutate the deviations heading that already exists in the file. Pre-patch states use `## Deviations and blockers`; new states use `## Active deviations and blockers`. Compact active-only content applies to both. Never call `replace-section`/`append-section` with a heading the file does not contain.

Pointer dispatch and canonical-heading fallback still apply: they do not require a state-schema change.

Create the state after capturing the pre-execution working tree so the state file itself is recognized as expected. Keep the plan immutable during execution.

Execution state is current recovery/control state, not an execution narrative. Keep it permanently and never rename or delete it. Detailed history lives in worker Result Artifacts and the repository.

Use this canonical structure:

```markdown
# Execution state: <plan title>

Plan: `<exact path>`
Plan SHA-256: `<digest>`
Execution artifacts: `.dev/execution/<execution-id>/`
Started: `<timestamp>`
Updated: `<timestamp>`
Status: `in-progress | blocked | completed`

## Baseline

- Commit: `<sha>`
- Relevant pre-existing changes: `<compact summary>`
- Drift decision: `<compact current decision>`

## Work packages

| ID | Status | Attempt | Executor | Result artifact | Focused verification |
| --- | --- | --- | --- | --- | --- |
| WP-01 | verified | 1 | senior-worker | `.../WP-01-attempt-01.md` | V1 pass |
| WP-02 | active | 2 | expert-worker | `.../WP-02-attempt-02.md` | pending |

## Active deviations and blockers

- None

## Integration and final verification

- Pending

## Completion

- Pending
```

A work-package row stores only status, latest attempt, executor, latest result artifact, and compact verification status. Do not accumulate implementation narratives, command stdout, changed-symbol detail, or superseded worker results in the state file.

`## Active deviations and blockers` (or the legacy `## Deviations and blockers` heading if that is what the file has) stores only items that still affect the next step. After a blocker is resolved, remove it with `replace-section` on that existing heading; do not keep a resolved narrative for audit completeness.

### State ownership and serialization

The execution agent owns all semantic execution records: drift decisions, package status judgments, blockers, deviations, corrective actions, verification interpretations, user decisions, completion claims. `audit-persistence` owns how those records are serialized into the existing state file.

After initialization, do not repeatedly load the entire state merely to edit it, and never rewrite the complete state file to update one row. Prefer narrow helper operations:

- `set-field` for `Status` and `Updated`;
- `upsert-table-row` for a `WP-*` row using the table's existing column shape (6-column latest attempt and result artifact on new states; 5-column rows on legacy states; do not append historical rows);
- `append-section` for a newly active deviation, blocker, or user decision, targeting the deviations heading already in the file;
- `replace-section` to set that same deviations heading to the remaining active items, or `- None`;
- `replace-section` or `append-section` for integration/final-verification records;

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

Follow `delegate-work` for every subagent. For a delegated implementation work package, pass pointers rather than reproducing canonical artifacts:

- Plan File
- Work Package ID
- Relevant Contract IDs
- Dependency Artifact Paths
- Result Artifact (exact path)

Plus task-local control: goal, included/excluded scope, access, write ownership (including the exact Result Artifact path), authority boundary, focused execution requirements, and any correction instruction.

Do not pass the full parent conversation, unrelated packages, copied WP prose, copied contract prose, or copied predecessor reports when those exist as stable artifacts.

Before pointer dispatch, confirm the target WP has one unique canonical heading in the plan. If it does not (legacy plan), fall back to inlining that WP's body, record one fallback deviation in execution state, and do not rewrite the old plan. Only plans created or revised after this protocol are guaranteed pointer-resolvable.

The worker must resolve those pointers itself. Missing, unreadable, or ambiguous plan/WP/contract/dependency artifacts are a blocker; do not default to re-sending WP prose.

On a new 6-column execution, delegated implementation work packages must provide Result Artifact. Derive `<execution-id>` from the execution-state basename and create `.dev/execution/<execution-id>/packages/` once per execution. Each attempt is:

```text
.dev/execution/<execution-id>/packages/<WP-ID>-attempt-NN.md
```

Attempt numbers are assigned by Main before dispatch:

1. Read the WP row's latest attempt; the next attempt is that value + 1, or 1 if none.
2. Upsert the state row (`Status=active`, `Attempt=N`, `Result artifact=<new path>`) before dispatch.
3. The worker creates the artifact with `audit-persistence` `write --exclusive`. A reused attempt number fails because the file exists. Never overwrite an old attempt.

Write ownership includes the exact Result Artifact path only, not `.dev/execution/**`.

`.dev/execution/` is git-versioned with the plan artifacts (via the existing `.dev` store) and retained permanently. Do not gitignore it. It is execution evidence, unlike `delegations/` (temporary relay, gitignored).

Suggested work-artifact shape:

```markdown
---
execution_id: <execution-id>
work_package: WP-07
attempt: 1
plan: <plan path>
plan_sha256: <digest>
executor: <logical worker role/tier>
outcome: completed
---

# WP-07 implementation result

## Delivered behavior

<concise factual description>

## Changes

- `src/foo.ts`
  - <material change>

## Verification

### V12

Command:
`...`

Result:
PASS

Observed:
<concise relevant evidence>

## Handoff

- <output needed by successor, or None>

## Deviations

- None

## Blockers

- None

## Evidence limitations

- None
```

For correction or resume of the same worker, pass pointers to the plan, work package, previous result artifact, the concrete failure, and a new attempt path. Do not re-copy the work package. Resume the same subagent for corrections when possible.

If a worker changes scope, shared interfaces, or files outside ownership, do not accept the result. Confirm the violation from the changed-file set and only the necessary diff context, preserve unrelated changes, and resume the same agent with the exact violation. If safe separation is no longer possible, serialize the work under main-agent control.

## Accept packages and verify integration

After a persisted implementation worker returns from a 6-column execution, and before the acceptance gate, confirm artifact completeness:

- the Result Artifact exists at the exact dispatch path;
- the file is non-empty;
- frontmatter `execution_id`, `work_package`, `attempt`, and `outcome` match this dispatch.

Missing or mismatched artifact is an incomplete return: resume the same worker to persist the artifact. Do not enter acceptance and do not transcribe the report into the artifact.

The compact receipt is the control-plane return. When more worker detail is needed, read the artifact. Do not expect a long implementation narrative in the parent conversation.

For each package, the main execution agent performs an acceptance gate rather than a second full code review:

- confirm the actual changed-file set stays within package ownership and that no shared interface, schema, contract boundary, or unrelated file was changed without authorization; inspect only the diff context needed to resolve those questions, not every changed hunk by default;
- confirm the worker produced the handoff outputs required by the plan and that direct consumers have the dependency information they need;
- confirm the worker reports the plan's focused `V*` commands and observed results. Rerun a focused check only when the plan requires coordinator-side verification, evidence is missing or ambiguous, a shared/load-bearing boundary changed, or a concrete risk/failure warrants independent confirmation;
- inspect reported deviations, blockers, and material drift. If acceptance fails, resume the same worker for correction when possible rather than independently re-reviewing and repairing the whole package;
- record executor, latest attempt, result artifact pointer, and compact verification status through narrow state-helper operations; and
- never release a consumer based only on a subagent completion claim.

A package marked `verified` has passed this dependency-release acceptance gate; it does not mean the main execution agent independently proved every changed hunk correct or performed full plan-conformance analysis. Patch-level defect hunting and complete plan-contract coverage belong to the outer review control plane after this skill returns.

After all packages are verified, run the plan's integration and end-to-end checks. Confirm every `R → C → WP → V` path and requested observable behavior. Record complete commands and observed results. Build/typecheck alone is insufficient when new behavior is promised.

## Classify execution discoveries

Before acting on a material risk, classify it:

- **`autonomous-fix`:** the plan or established contract already determines correct behavior and the correction stays within authorized scope. Fix, verify, and record the decision and evidence.
- **`verification-escalation`:** behavior is settled but risk warrants stronger proof. Add the smallest meaningful negative/failure/repetition/concurrency/compatibility check and record why.
- **`decision-escalation`:** multiple reasonable corrections change user behavior, public interfaces, data, security, compatibility, failure semantics, rollout, authority, or external effects. Pause affected work and ask the user with evidence, impact, options, and recommendation.

These records are semantic content owned by the execution agent. Serialize currently active items into the deviations heading that already exists in the state file without reproducing the rest of the file.

## Complete and hand off

Mark the execution state `completed` only after all work packages and final verification are truthfully closed. Do not initiate `review-patch` or `review-plan-conformance`, create `.dev/review/` artifacts, adjudicate findings, or own review routing and retry limits. Final patch and plan-conformance review belong to the outer control plane, which may commission those review skills independently in fresh read-only contexts.

When the same execution session is resumed with an outer-control-plane change request, treat it as bounded correction input: verify it against the accepted plan, make only authorized fixes, rerun affected focused checks plus final verification, update the existing execution state and result evidence, and hand control back. Escalate rather than guessing when the request changes product behavior, scope, architecture, data, security, compatibility, or another settled contract.

Report the implemented outcome, execution-state path, changed files, focused and final verification with observed results, contract deviations, blockers, and residual limitations. Preserve the exact implementation session and artifact pointers needed by the outer control plane for any later rework.
