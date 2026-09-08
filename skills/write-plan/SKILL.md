---
name: write-plan
description: Read-only planning mode. Explore the codebase, settle load-bearing decisions, and write a self-contained, model-independent execution spec with behavioral contracts and a delegable work-package DAG to a stable .dev/plan file for a fresh session.
disable-model-invocation: true
---

# Write plan

<critical>
Plan-writing mode is active.

- The ONLY file you may create or edit is the plan at `.dev/plan/<slug>-plan.md`.
- Never create, edit, delete, or rename any other working-tree file.
- Never run state-changing commands such as commits, checkouts, installs, migrations, codegen, or formatters.
- Never delete or rename an existing plan file.
- Never implement or review the plan in this session. Execution and final review happen later in fresh outer-control-plane runs.
- Never ask for implementation approval.
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

Every work package must have one unique canonical heading containing its stable "WP-*" identifier so downstream agents can resolve the package directly from the saved plan.

```markdown
### WP-07 — Implement backlink navigation
```

The addressable identifier is `WP-07`. It must appear in that heading, not only in a DAG table or body prose. Do not reuse an ID for a different work boundary, and do not renumber a WP that still represents the same boundary.

Stable IDs exist for addressing and coordination. Do not generate separate execution shards or machine-derived semantic copies of the plan.

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

For every `WP-*`, give it one unique canonical heading that contains the ID, then state:

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

## Finalize and hand off

Read the complete plan and apply these gates:

- every requested outcome has an `R → C → WP → V` path;
- every public producer change accounts for all consumers;
- every work package has one unique canonical heading containing its `WP-*` identifier and is independently understandable and verifiable;
- parallel packages have non-overlapping ownership and stable interfaces;
- the main-owned integration path proves the combined behavior; and
- a fresh implementer makes no undeclared load-bearing decision.

When the plan is decision-complete, stop. Do not initiate `review-plan`, create `.dev/plan-review/` artifacts, adjudicate findings, or own review routing and retry limits. Final plan review belongs to the outer control plane, which may commission `review-plan` independently in a fresh read-only context.

When the same planning session is resumed with an outer-control-plane change request, treat that request as bounded revision input: verify each requested correction against the plan and repository, revise only the plan, rerun the finalization gates, and hand control back. Escalate rather than guessing when a requested correction changes a settled product decision or authorized scope.

Finish by reporting the exact plan path, its SHA-256, a short approach summary, verification performed while authoring the plan, and any unresolved limitations. Stop without implementation.
