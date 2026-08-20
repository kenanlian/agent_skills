---
name: write-plan
description: Read-only planning mode. Explore the codebase, settle load-bearing decisions, and write a self-contained, model-independent execution spec with behavioral contracts and a delegable work-package DAG to a stable .dev/plan file for a fresh session.
---

# Write plan

<critical>
Plan-writing mode is active.

- The ONLY file you may create or edit is the plan at `.dev/plan/<slug>-plan.md`.
- Never create, edit, delete, or rename any other working-tree file.
- Never run state-changing commands such as commits, checkouts, installs, migrations, codegen, or formatters. Read-only shell commands and genuinely non-mutating checks are allowed.
- Never delete or rename an existing plan file.
- Never implement the plan in this session. Execution happens later in a fresh session that starts from the saved plan.
- Never ask for implementation approval. The optional plan-review choice described below is a quality gate, not implementation approval.
</critical>

## Write an execution specification

The plan is the semantic source of truth for a fresh implementer that may have none of the originating conversation. It must settle every product, behavior, architecture, interface, data, compatibility, security, and rollout decision that implementation depends on. Local implementation choices remain free only when they cannot change an observable contract or cross-work-package boundary.

Self-contained does not mean copying the repository or a domain skill into the document. Record every load-bearing decision and exact repository anchor; name a required skill only as an execution dependency for how to work. Never substitute “follow the skill” for behavior, failure, compatibility, or verification requirements.

Detail exists to remove decisions, not to add ceremony. Cut narration, generic risks, alternatives already rejected, unaffected behavior, and repeated mechanical edits.

## Select the plan file

Plans live in `.dev/plan/` at the repository root. List that directory before writing.

- If a plan for this task already exists, read and update it incrementally; remove sections invalidated by the new request.
- Otherwise choose a short lowercase kebab-case slug and create `.dev/plan/<slug>-plan.md`.
- Leave plans for other tasks untouched. The stable filename is the execution entry point and persists across revisions.

Use incremental edits and structure the document with `##` and `###` sections. Write grounded findings as they become stable instead of batching the entire document at the end. Keep the plan free of progress checkboxes, execution status, and review banners.

## Ground facts with bounded exploration

Discover repository facts instead of asking the user. Read every file whose current behavior, interface, convention, or verification path is load-bearing. Every stated path, symbol, signature, caller, schema, command, and existing behavior must come from evidence inspected in this session.

For a task with more than one independent evidence question or more than one affected subsystem, follow `delegate-work` and use read-only subagents in waves:

1. **Map in parallel.** Give scouts non-overlapping questions covering current behavior and call paths, consumers and public interfaces, tests and repository conventions, plus task-relevant data, security, compatibility, or rollout concerns.
2. **Close gaps.** Synthesize compact evidence, then dispatch focused follow-ups only for unresolved load-bearing claims. Resume the same scout when its existing local context is useful.
3. **Challenge the draft.** Before finalization, use an independent read-only critic for large or cross-cutting plans to search for omitted consumers, unsupported facts, missing failure behavior, unverifiable acceptance criteria, and unsafe work-package boundaries.

The main agent is the only plan writer and owns every design decision. Verify public interfaces, data and security boundaries, state machines, negative searches, and cross-work-package dependencies directly before relying on scout summaries.

If an external fact cannot be confirmed, mark it `unverified` and provide a pre-decided executable contingency. Never leave a load-bearing choice for the implementer. Ask the user only for preferences or tradeoffs that repository exploration cannot settle, and batch only questions that materially change the plan.

## Design a model-independent work graph

Assign stable IDs:

- `R1`, `R2`, ... for requested outcomes;
- `C1`, `C2`, ... for observable behaviors, invariants, prohibitions, and shared interfaces;
- `WP-01`, `WP-02`, ... for implementation work packages; and
- `V1`, `V2`, ... for verification cases.

Every requirement must map through at least one contract and work package to verification. Every work package must map back to an authorized requirement. The plan names capability roles and delegation policy, never a concrete model.

A work package is bounded only when it has one decidable goal, stable inputs, explicit ownership, no unresolved cross-package decision, and focused verification. Split a package that needs unrelated subsystems or too much task-local context. Do not split one closed behavior into tiny layer-based edits that force several agents to coordinate a single interface.

Express dependencies as a DAG. Mark why a node is serial, which ready nodes are parallel-safe, and which verified output a successor consumes. For `Delegation`, use exactly one value:

- `preferred`: a closed package that should normally run in a subagent, even if serial;
- `allowed`: small work whose dispatch cost may exceed direct execution; or
- `main-required`: shared-contract decisions, cross-package integration, or final verification that require the coordinating agent.

Parallel write packages must have exclusive, non-overlapping ownership and stable shared interfaces. Put implementation and its focused tests in the same package. Make integration and end-to-end verification explicit main-owned packages rather than leaving them implicit.

## Plan contents

Open with a `#` title, then use these sections:

### Context

Restate the literal request, why it is needed, and the intended end state in 2–4 sentences. Add no outcome beyond the request.

### Baseline

Record the repository root, current commit, task-relevant dirty files or diffs, exact dependency/config versions that matter, and the anchors the executor must use to classify material drift. Unrelated dirty work remains user-owned.

### Requirements & behavioral contracts

List the `R*` requirements and `C*` contracts. Give exact externally visible literals, signatures, fields, precedence, compatibility, permissions, state transitions, or error behavior only when they are load-bearing. Include applicable empty, missing, conflict, repeated, concurrent, cancellation, cleanup, and failure behavior.

### Work-package DAG

Show the dependency graph or a compact dependency table. State serial reasons, parallel-safe groups, and the verified predecessor outputs that unlock successors.

### Work packages

For every `WP-*`, state:

- **Goal and contracts:** one observable result and the `R*`/`C*` IDs it delivers.
- **Dependencies and scheduling:** predecessors, serial reason, parallel-safe peers, and `Delegation` value.
- **Authority and ownership:** allowed files/modules, excluded scope, decisions it may not make, and required domain skill or `None`.
- **Grounded implementation:** exact repository anchors and existing patterns to reuse; concrete edits and exact public symbols or literals when load-bearing. For removals or contract changes, enumerate every verified consumer or give the exact exhaustive search.
- **Failure behavior:** applicable edge, error, cleanup, retry, compatibility, and rollback behavior.
- **Focused verification:** `V*` cases with commands or observable checks that prove this package and would fail for a plausible defect.
- **Handoff:** exact interfaces or artifacts made available to successor packages.

### Integration & verification

Map every `R*` and `C*` to its `WP-*` and `V*`. Give exact focused, integration, and end-to-end commands with working directory, environment, fixtures, inputs, expected outputs, and any manual reachability steps. Build or typecheck alone is never sufficient for new behavior.

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

After the plan is decision-complete, honor any review preference the user already stated. Otherwise use the host's available user-input mechanism to ask whether to run `review-plan`, and recommend review when any of these apply: multiple affected subsystems, public interfaces, migrations or compatibility, authorization or security, billing or destructive behavior, concurrency, external side effects, rollout ordering, unverified external facts, or a large multi-package DAG. For a small low-risk change, recommend skipping while leaving the choice to the user.

If the user chooses review, follow `delegate-work` and dispatch an independent read-only reviewer that loads `review-plan` and receives the exact plan path. Verify every blocking finding yourself. Revise the plan for confirmed in-scope findings and repeat review until `APPROVE`; ask the user only when correction needs a new preference, authority, external side effect, or scope expansion. If an independent reviewer is unavailable or stalls beyond a reasonable bounded-review window, interrupt it, perform the same review directly, disclose that limitation, and do not spawn a replacement.

Finish by reporting the exact plan path, a 2–3 sentence approach summary, and whether review was approved, skipped, or unavailable. Stop without implementation.
