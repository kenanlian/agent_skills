---
name: delegate-work
description: Delegate bounded exploration, implementation, review, design, or research to an isolated subagent using a self-contained task contract and host-specific capability routing. Use when work should run in a separate context, serially through a specialist, or in parallel.
---

# Delegate work

The parent agent is the control plane: it owns decomposition, shared contracts, cross-task decisions, integration, verification, and the final answer. Subagents perform bounded work; serial work may still be delegated when its inputs are stable and its result is independently verifiable.

Use one platform-neutral delegation model. Role separates specialized exploration and review from tiered worker reasoning. Work type defines the task contract; capability tier applies only to workers; the host adapter translates the semantic route into platform-specific subagent and model selection.

## Require a bounded task

Delegate only when the assignment has all of these properties:

- one concrete goal whose success is decidable;
- explicit included and excluded scope;
- stable inputs and no unresolved cross-task interface decision;
- an ownership boundary that prevents concurrent write conflicts;
- a focused verification method or a concrete evidence standard; and
- a result that can be returned as a compact conclusion rather than raw working notes.

If the assignment needs several unrelated subsystems, changes a shared contract while consumers are still unsettled, or requires a long narrative to explain its completion state, split or resolve it before dispatch. Parallelism is optional; boundedness is mandatory.

## Classify the delegation

Classify every delegation along four independent dimensions before selecting a host route.

### Role

- `explorer`: performs bounded, read-only repository evidence discovery. It locates, traces, maps, enumerates, and cross-checks files, symbols, callers, consumers, routes, tests, registrations, state or data flows, and other repository facts. It owns evidence, not engineering judgment.
- `worker`: performs bounded research, implementation, design, planning, or analysis that requires task-local engineering judgment.
- `reviewer`: independently evaluates an artifact or implementation. A reviewer is a special role, not a stronger worker tier.

Use `explorer` when the requested deliverable is repository evidence: what exists, where it is, who calls or consumes it, how the current code path flows, or whether an exhaustive search finds another route. Search breadth may be broad or exhaustive; breadth alone does not make the task a stronger worker tier. An explorer may explain a current flow when the explanation follows directly from traced evidence, but it must not own root-cause diagnosis, architecture or design choices, correctness judgments, risk decisions, or review verdicts. Route those tasks to an appropriately tiered `worker` or to `reviewer`.

Evidence scouts requested by planning, execution, or review workflows are `explorer` when their deliverable is repository facts, including interface traces, consumer closure, behavioral traces, bypass sweeps, negative searches, verification-path discovery, and ownership checks. The calling worker or reviewer retains every judgment based on that evidence.

Use `reviewer` only when the delegated task owns an independent judgment about an artifact or implementation.

### Capability tier

Capability tier applies only to `worker`. Both `explorer` and `reviewer` use `None`.

Worker tiers express required reasoning capability, not work type:

- `junior`: straightforward, well-scoped, low-risk work with frozen interfaces, little ambiguity, and limited task-local reasoning.
- `senior`: default tier for normal software-engineering work requiring moderate context, judgment, or ordinary cross-file reasoning.
- `expert`: complex, ambiguous, cross-subsystem, architecture-sensitive, lifecycle-heavy, integration-heavy, or high-risk work requiring deep reasoning.

Default a worker to `senior`. Downgrade to `junior` only when the task is clearly small and closed. Upgrade to `expert` when one or more load-bearing complexity signals are present; file count alone is not a tier signal.

Typical `junior` work includes a small frozen-interface edit, a simple configuration change, a local UI/style adjustment, or a focused test correction.

Typical `senior` work includes a normal planned work package, a bounded multi-file implementation, ordinary bug investigation, or a moderate refactor with settled contracts.

Typical `expert` work includes cross-subsystem state or lifecycle analysis, difficult integration, architecture or shared-contract work, open-ended root-cause investigation, high-regression-risk changes, or exhaustive negative-path reasoning that requires deciding what the evidence means.

A read-only worker task may be `expert`; a writing task may be `junior`. Do not infer worker tier from `read-only` versus `write`, and do not promote an explorer merely because its search scope is large.

### Access

- `explorer`: always `read-only`.
- `worker`: `read-only` or `write` according to the requested deliverable.
- `reviewer`: always `read-only`.

For a writable worker, the subagent may modify only its explicit write ownership and owns focused tests for those changes. Access follows the requested deliverable and task contract; it does not select the worker model tier.

### Work type

Record the requested deliverable as one of `exploration`, `research`, `implementation`, `design`, `planning`, `analysis`, or `review`. Work type controls prompt framing, evidence, and verification; it does not select a worker model tier.

`exploration` pairs with role `explorer`: its deliverable is repository evidence rather than an engineering judgment. `review` pairs with role `reviewer`. The remaining work types normally pair with role `worker`.

A task whose requested deliverable is code or file changes is `implementation` even when it first needs to inspect the codebase. A task that asks why a traced behavior is wrong, what its root cause is, or how it should be redesigned is `analysis` or `design`, not `exploration`, even when it is read-only.

## Load the host adapter

After classifying the delegation, load and follow exactly one host reference for the active platform:

- Codex: `references/codex.md`
- Cursor: `references/cursor.md`
- OpenCode: `references/opencode.md`

The host reference owns concrete model mapping, subagent invocation mechanics, platform-specific isolation, waiting or timeout behavior, and platform-specific resume mechanics.

Do not duplicate those details in plans, task DAGs, caller skills, or the common task contract. Do not load unrelated host references merely to compare implementations during normal delegation.

If the active host is not covered by a reference, keep the common semantic classification and task contract stable, then use only host-native subagent behavior that preserves isolation, bounded scope, and same-subagent correction. Do not invent a cross-platform model mapping.

## Build the task contract

Every delegated prompt must be self-contained and minimal because a subagent may start with no conversation history and has its own finite context. Include every section below; use `None` rather than silently omitting a section that has no content.

```markdown
## Delegation

Role: `<explorer | worker | reviewer>`
Capability tier: `<None for explorer/reviewer | junior | senior | expert for worker>`
Access: `<read-only for explorer/reviewer | read-only | write for worker>`
Work type: `<exploration | research | implementation | design | planning | analysis | review>`

## Required skill

Required skill: `<skill-name or None>`

If a skill is named, load and follow it before starting. Treat it as the task-specific workflow and output authority.

Required references:
- `<reference paths, or None>`

## Task

<State the concrete work to perform and enough context to understand it.>

## Goal

<State the observable end result or exact question to answer.>

## Scope

Repository:
- `<workspace or repository>`

Included:
- `<files, modules, symbols, behaviors, plan sections, or diff range>`

Excluded:
- `<areas and changes outside the assignment>`

Write ownership:
- `<exclusive writable files or modules, or read-only>`

## Context

Shared contracts:
- `<only the global behavior and invariants this task must preserve>`

Task-local context:
- `<relevant paths, symbols, patterns, errors, or decisions>`

Verified dependency outputs:
- `<interfaces or artifacts produced by completed predecessors, or None>`

Authority boundaries:
- `<decisions the subagent may and may not make>`

## Requirements

- `<task-specific constraints>`

## Verification

- `<focused commands, expected observations, or evidence standard>`

## Return

Return all of the following:
1. Outcome: whether the Goal was achieved.
2. Work performed: the bounded investigation, implementation, or review completed.
3. Evidence: relevant files, symbols, changed files, or observed behavior.
4. Verification: commands or checks and their observed results.
5. Contract deviations: any scope, interface, or behavior difference from this task contract.
6. Remaining issues: blockers, unresolved questions, or evidence limitations.

Do not return raw exploration notes, full logs, or large source excerpts unless explicitly requested. Mark material claims as `confirmed`, `inferred`, or `unverified`.
```

Use `Required skill: None` when no applicable domain skill exists; never invent one. When a skill is required, the parent reads it and every reference needed to define scope, safety, shared contracts, or verification before dispatch, and the subagent independently loads the named skill and its task-required references.

The task contract has this authority order: its task-specific requirements, the referenced plan work package and shared contracts, then repository reality. Resolve a conflict between them before dispatch instead of asking the subagent to redesign the work.

Self-contained does not mean exhaustive. Pass the relevant shared contracts, the current work package, and direct dependency outputs. Do not pass the parent conversation, unrelated plan sections, other work packages' implementation details, duplicated skill text, or raw discovery logs. If the necessary context is still too large, split the task.

## Adapt the contract to the work type

Retain the common Return fields, then add only the work-type-specific evidence:

- **Exploration:** answer one explicit repository question. Locate, trace, map, enumerate, and cross-check as needed; return exact paths, symbols, relevant flow or relationship, search coverage, and evidence limitations. A claim that no other caller, consumer, route, bypass, registration, or reference exists must state the aliases and string forms searched. Explain what the current code does only to the extent supported by traced evidence; do not diagnose, redesign, decide correctness, or issue a review verdict.
- **Research:** answer one explicit research question with source versions, evidence, and limitations; separate externally sourced facts from repository facts.
- **Implementation:** return files changed, behavior delivered, tests added or updated, focused commands with observed results, and any scope expansion that was needed but not performed. The same subagent owns its local implementation and focused tests.
- **Review, design, planning, or analysis:** return a direct verdict or recommendation, findings with triggers and evidence, and unresolved decisions. Explorers may locate evidence, but the reviewing, designing, planning, or analyzing agent owns its judgment.

Do not change a worker capability tier merely because its work type changes during normal task-local execution. Reclassify only when newly discovered scope or risk materially changes the reasoning requirement. If an explorer discovers that the caller's real question requires diagnosis, design, or judgment, return the evidence gathered plus that boundary instead of silently answering beyond the explorer role. The parent may then dispatch a worker with the appropriate tier.

## Dispatch and collect

1. Classify role, capability tier, access, and work type. Enforce `explorer → None + read-only + exploration`, `reviewer → None + read-only + review`, and `worker → junior | senior | expert`. Name the required domain skill or `None`; do not ask the subagent to guess.
2. Load the active host reference and apply its adapter. Put only the context needed for the bounded task in the contract.
3. Dispatch ready work concurrently only when dependency outputs are stable, write ownership does not overlap, and no shared interface remains unsettled. A dependent task may be delegated serially after its predecessor is verified.
4. Wait for every result in the current wave and verify its contract, actual edits, and focused checks before releasing dependent work.
5. Reject and correct any scope violation. A subagent that discovers a necessary out-of-scope edit returns it as a blocker instead of making it.
6. If a response violates the contract or verification finds an error, do not spawn a replacement. Resume that same subagent using the active host reference's correction mechanism, with the failed requirement, concrete evidence of the problem, and the exact correction required. Repeat verification and resume until the result passes or the same subagent cannot proceed.
7. Do not wait indefinitely on a stalled subagent. Apply the active host reference's waiting rules when it defines them. Interrupt a genuinely stalled agent when it has exceeded a reasonable window for its bounded task. For optional scouting or critique, verify that partition directly and disclose the limitation; for a required deliverable, complete it under the parent agent when safe or report the exact blocker. Never spawn a silent replacement.
8. If the original subagent is no longer resumable, report that as a blocker rather than silently creating a new one.
9. Keep the parent agent grounded in load-bearing repository facts. Summaries reduce noise but do not replace independent verification of public interfaces, data and security boundaries, negative claims, integration behavior, or final acceptance.
