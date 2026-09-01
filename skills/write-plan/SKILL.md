---
name: write-plan
description: Read-only planning mode. Explore the codebase, settle load-bearing decisions, and write a self-contained, model-independent execution spec with behavioral contracts and a delegable work-package DAG to a stable .dev/plan file for a fresh session.
disable-model-invocation: true
---

# Write plan

<critical>
Plan-writing mode is active.

- Before plan review begins, the ONLY file you may create or edit is the plan at `.dev/plan/<slug>-plan.md`.
- If the user selects plan review, audit artifacts may additionally be created or updated only under that review run's `.dev/plan-review/<review-run-id>/` directory.
- Never create, edit, delete, or rename any other working-tree file.
- Never run state-changing commands such as commits, checkouts, installs, migrations, codegen, or formatters. Deterministic audit-persistence commands that only touch the authorized review directory are allowed after review is selected.
- Never delete or rename an existing plan file or prior review artifact.
- Never implement the plan in this session. Execution happens later in a fresh session that starts from the saved plan.
- Never ask for implementation approval. Plan review is a quality gate, not implementation approval.
</critical>

## Write an execution specification

The plan is the semantic source of truth for a fresh implementer that may have none of the originating conversation. It must settle every product, behavior, architecture, interface, data, compatibility, security, and rollout decision that implementation depends on. Local implementation choices and ordinary repository navigation remain free when they cannot change an observable contract or cross-work-package boundary.

Self-contained does not mean copying the repository. Record every load-bearing decision and the repository path, symbol, interface, or command needed to act on it. Use exact line numbers, counts, and helper locations only when they determine behavior, ownership, ordering, drift, or whether verification is executable. Detail exists to remove decisions, not to add ceremony.

## Select the plan file

Plans live in `.dev/plan/` at the repository root. List that directory before writing.

- If a plan for this task already exists, read and update it incrementally; remove sections invalidated by the new request.
- Otherwise choose a short lowercase kebab-case slug and create `.dev/plan/<slug>-plan.md`.
- Leave plans for other tasks untouched. The stable filename is the execution entry point and persists across revisions.

Use incremental edits. Keep the plan free of progress checkboxes, execution status, and review banners.

## Ground facts with bounded exploration

Discover repository facts instead of asking the user. Read every file whose current behavior, interface, convention, or verification path is load-bearing. Ground every stated load-bearing path, symbol, signature, caller, schema, command, and existing behavior in evidence inspected in this session.

For a task with more than one independent evidence question or more than one affected subsystem, follow `delegate-work` and use read-only explorers in waves:

1. **Map in parallel.** Give explorers non-overlapping questions covering current behavior and call paths, consumers and public interfaces, tests and repository conventions, plus task-relevant data, security, compatibility, or rollout concerns.
2. **Close gaps.** Synthesize compact evidence, then dispatch focused follow-ups only for unresolved load-bearing claims. Resume the same explorer when its existing context is useful.
3. **Challenge the draft.** Before finalization, use an independent read-only critic for large or cross-cutting plans to search for omitted material consumers, unsupported load-bearing facts, missing failure behavior, weak acceptance criteria, and unsafe work-package boundaries.

The main planning agent is the only live-plan writer and owns every design decision. Verify public interfaces, data and security boundaries, state machines, negative searches, and cross-work-package dependencies directly before relying on delegated summaries.

If an external fact cannot be confirmed, mark it `unverified` and provide a pre-decided executable contingency. Ask the user only for preferences or tradeoffs that repository exploration cannot settle.

## Design a model-independent work graph

Assign stable IDs:

- `R1`, `R2`, ... for requested outcomes;
- `C1`, `C2`, ... for observable behaviors, invariants, prohibitions, and shared interfaces;
- `WP-01`, `WP-02`, ... for implementation work packages; and
- `V1`, `V2`, ... for verification cases.

Every requirement must map through at least one contract and work package to verification. Every work package must map back to an authorized requirement. The plan names capability roles and delegation policy, never a concrete model.

A work package is bounded only when it has one decidable goal, stable inputs, explicit ownership, no unresolved cross-package decision, and focused verification. Express dependencies as a DAG. Mark why a node is serial, which ready nodes are parallel-safe, and which verified predecessor output a successor consumes.

For `Delegation`, use exactly one value:

- `preferred`: a closed package that should normally run in a subagent, even if serial;
- `allowed`: small work whose dispatch cost may exceed direct execution; or
- `main-required`: shared-contract decisions, cross-package integration, or final verification that require the coordinating agent.

Parallel write packages must have exclusive, non-overlapping ownership and stable shared interfaces. Put implementation and its focused tests in the same package. Make integration and end-to-end verification explicit main-owned packages.

## Plan contents

Open with a `#` title, then use these sections.

### Context

Restate the literal request, why it is needed, and the intended end state in 2–4 sentences. Add no outcome beyond the request.

### Baseline

Record repository root, current commit, task-relevant dirty files or diffs, dependency/config versions that materially constrain the task, and the anchors the executor must use to classify material drift. Unrelated dirty work remains user-owned.

### Requirements & behavioral contracts

List the `R*` requirements and `C*` contracts. Give exact externally visible literals, signatures, fields, precedence, compatibility, permissions, state transitions, and error behavior only when load-bearing. Include applicable empty, missing, conflict, repeated, concurrent, cancellation, cleanup, and failure behavior.

### Work-package DAG

Show the dependency graph or a compact dependency table. State serial reasons, parallel-safe groups, and verified predecessor outputs that unlock successors.

### Work packages

For every `WP-*`, state:

- **Goal and contracts:** one observable result and the `R*`/`C*` IDs it delivers.
- **Dependencies and scheduling:** predecessors, serial reason, parallel-safe peers, and `Delegation` value.
- **Authority and ownership:** allowed files/modules, excluded scope, decisions it may not make, and required domain skill or `None`.
- **Grounded implementation:** repository paths, symbols, existing patterns, concrete edits, and exact public symbols or literals when load-bearing. For removals or contract changes, enumerate every material verified consumer or give the exhaustive search.
- **Failure behavior:** applicable edge, error, cleanup, retry, compatibility, and rollback behavior.
- **Focused verification:** `V*` cases with commands or observable checks that prove the package and would fail for a plausible defect.
- **Handoff:** exact interfaces or artifacts made available to successors.

### Integration & verification

Map every `R*` and `C*` to its `WP-*` and `V*`. Give exact focused, integration, and end-to-end commands with working directory, environment, fixtures, inputs, expected outputs, and manual reachability steps when needed. Build or typecheck alone is never sufficient for new behavior.

### Assumptions & contingencies

Include only user-overridable decisions or load-bearing external assumptions. For each assumption that can become false, prescribe the fallback so execution does not need to recreate this conversation.

## Finalize and offer plan review

Read the complete plan and apply these gates:

- every requested outcome has an `R → C → WP → V` path;
- every public producer change accounts for all consumers;
- every work package is independently understandable and verifiable;
- parallel packages have non-overlapping ownership and stable interfaces;
- the main-owned integration path proves the combined behavior; and
- a fresh implementer makes no undeclared load-bearing decision.

After the plan is decision-complete, honor any review preference the user already stated. Otherwise ask whether to run `review-plan`. Recommend review for multiple affected subsystems, public interfaces, migrations or compatibility, authorization or security, billing or destructive behavior, concurrency, external side effects, rollout ordering, unverified external facts, or a large multi-package DAG. For a small low-risk change, recommend skipping while leaving the choice to the user.

If review is skipped, do not create plan-review artifacts.

## Plan-review persistence ownership

When review is selected, use `audit-persistence` for mechanical persistence. The ownership split is strict:

- **Planning agent:** live plan, finding adjudication, plan revisions, and user-facing decisions.
- **Audit helper:** review-run directory creation, exact plan snapshots, manifest serialization, timestamps/hashes/paths, and other mechanical bookkeeping.
- **`review-plan` agent:** its complete immutable raw review artifact.

The planning agent must never receive a full raw review merely so it can reproduce that review into a file. The reviewer writes its own artifact before returning. The parent receives only the compact control result defined by `review-plan` and reads specific finding sections from the artifact on demand while adjudicating.

## Create the plan-review run

Derive `<slug>` from the plan basename by removing `.md` and then a final `-plan`. Create a new review run ID `<slug>-review-YYYYMMDD-HHmmss` using host-local time and create `.dev/plan-review/<review-run-id>/`. Never reuse, overwrite, rename, or delete an earlier review run. A later review cycle starts a new timestamped directory and links the prior run when applicable.

Create `manifest.md` once before round 1. It remains a compact mutable index, not raw evidence:

```markdown
---
review_run_id: <review-run-id>
prior_review_run: <prior review-run path or null>
plan: <exact live plan path>
started: <timestamp>
completed: <timestamp or null>
rounds: 0
max_rounds: 3
cycle_status: active
completion_reason: pending
final_verdict: pending
---

# Plan review manifest

## Reviewer provenance

- write-plan skill version: `<reported revision or unknown>`
- review-plan skill version: `<reported revision or unknown>`
- main-agent model: `<host-reported identifier or unknown>`
- main-agent reasoning configuration: `<host-reported value or unknown>`

## Repository context

- Baseline commit: `<sha>`
- Relevant pre-existing changes: `<paths and notes, or None>`

## Rounds

- Pending

## Final summary

- Pending
```

Use helper field/section operations for later manifest updates instead of rereading and rewriting the complete file.

## Run one plan-review round

For round `N` from 1 through 3:

1. Allocate the next integer round.
2. Use an exact deterministic copy, preferably `audit-persistence copy`, to save the current live plan as immutable `round-NN-plan.md`. Never regenerate this snapshot through model output.
3. Record current repository `HEAD` and task-relevant dirty-state summary.
4. Dispatch an independent reviewer via `delegate-work` with:
   - `Required skill: review-plan`;
   - `Plan File` set to the immutable `round-NN-plan.md`, not the live plan;
   - `Review Run ID` and `Review Round`;
   - `Raw Review Artifact` set to `.dev/plan-review/<review-run-id>/round-NN-review.md`;
   - source/worktree access read-only, with exclusive audit-write permission only for that raw artifact path.
5. The reviewer must write the complete report directly to `round-NN-review.md` before returning. Treat a reviewer return without the required artifact as an incomplete dispatch that does not consume the round.
6. Accept only the compact reviewer return: verdict, confidence, artifact path, and finding index (`PR-*`, severity, category, one-line summary). Do not request the full coverage matrix or full report in the parent response.
7. Independently validate every reported `P0`–`P3` finding. Read only the relevant finding/evidence sections from the raw artifact when the compact return is insufficient.
8. Write `round-NN-adjudication.md` before revising the live plan. This is new planning-agent reasoning, so the planning agent owns the content.

Use this adjudication schema:

```markdown
---
review_run_id: <review-run-id>
round: <N>
adjudicated_at: <timestamp>
reviewed_plan: <round-NN-plan.md>
---

# Plan review adjudication

### PR-01 — <short title>

- Reviewer severity: `<P0-P3>`
- Reviewer category: `<category>`
- Materiality: `<blocking | advisory>`
- Origin: `<original-plan | previous-review-fix | other>`
- Status: `<confirmed | rejected | duplicate | out-of-scope | unverifiable>`
- Reason: `<plan/repository-backed adjudication>`
- Evidence: `<plan section plus repository anchor when applicable>`
- Resolution: `<incorporated | no-change | needs-user-direction | pending>`
- Revision evidence: `<changed plan section/contract/package, None, or Pending>`

## Round summary

- Findings: `<reported N; new material N; carried material N; confirmed advisory N; introduced by previous review fix N; rejected N; duplicate N; out-of-scope N; unverifiable N>`
```

Do not copy the reviewer's full finding prose into adjudication. Preserve reviewer claims in the raw artifact and record only the planning agent's classification, reason, evidence, and resolution.

For rounds 1 and 2, close the gate as `APPROVE` when adjudication leaves no confirmed in-scope P0–P2 finding. Otherwise revise the live plan for confirmed in-scope P0–P2 findings, update adjudication resolution/revision evidence, and rerun. P3 is advisory by default and never triggers a rerun alone.

After each round, update `manifest.md` through helper field/section operations with snapshot path, raw review path, adjudication path, raw verdict/confidence, and compact adjudication counts. Never rewrite raw round evidence.

After round 3, persist and adjudicate the report before further action. If no confirmed P0–P2 finding remains, close as `APPROVE`. If any remains, do not revise automatically and do not dispatch round 4; close as `max-rounds-escalated` and ask the user to choose whether to revise the governing decision or plan, accept the documented risk, stop, or authorize a substantively revised new cycle.

A user-authorized new cycle starts a new timestamped review-run directory at round 1 after a material plan or decision change. Link the prior run in its manifest.

If an independent reviewer is unavailable, perform the same review directly, write the raw review artifact once with provenance identifying the main agent, disclose the limitation, and continue through the same adjudication protocol. Do not create a fake reviewer round without a raw artifact.

Finish by reporting the exact plan path, plan-review artifact directory when review ran, a short approach summary, and whether review was approved, skipped, escalated, or unavailable. Stop without implementation.
