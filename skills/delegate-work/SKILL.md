---
name: delegate-work
description: Delegate bounded exploration, implementation, review, design, or research to an isolated subagent using a self-contained task contract and host-specific capability routing. Use when work should run in a separate context, serially through a specialist, or in parallel.
---

# Delegate work

The parent agent is the control plane: it owns decomposition, shared contracts, cross-task decisions, integration, verification, and the final answer. Subagents perform bounded work; serial work may still be delegated when inputs are stable and results are independently verifiable.

Use one platform-neutral delegation model. Role separates specialized exploration and review from tiered worker reasoning. Work type defines the task contract; capability tier applies only to workers; the host adapter translates the semantic route into platform-specific subagent/model selection.

## Require a bounded task

Delegate only when the assignment has:

- one concrete goal whose success is decidable;
- explicit included and excluded scope;
- stable inputs and no unresolved cross-task interface decision;
- an ownership boundary that prevents concurrent write conflicts;
- a focused verification method or concrete evidence standard; and
- a result that can return as a compact conclusion rather than raw working notes.

If the assignment needs unrelated subsystems, changes a shared contract while consumers are unsettled, or requires a long narrative to explain completion state, split or resolve it before dispatch. Parallelism is optional; boundedness is mandatory.

## Classify the delegation

Classify every delegation along four dimensions.

### Role

- `explorer`: bounded repository evidence discovery. Locates, traces, maps, enumerates, and cross-checks facts. Owns evidence, not engineering judgment.
- `worker`: bounded research, implementation, design, planning, or analysis requiring task-local engineering judgment.
- `reviewer`: independently evaluates an artifact or implementation. A reviewer is a special role, not a stronger worker tier.

Use `explorer` for repository evidence questions. Search breadth may be exhaustive; breadth does not turn exploration into worker reasoning. Explorers must not own root-cause diagnosis, architecture/design choices, correctness judgments, risk decisions, or review verdicts.

Evidence scouts requested by planning, execution, or review workflows are explorers when their deliverable is repository facts. The calling worker or reviewer retains every judgment based on that evidence.

Use `reviewer` only when the delegated task owns an independent judgment.

### Capability tier

Capability tier applies only to `worker`. `explorer` and `reviewer` use `None`.

- `junior`: straightforward, well-scoped, low-risk work with frozen interfaces and limited reasoning.
- `senior`: default normal software-engineering work requiring moderate context or cross-file reasoning.
- `expert`: complex, ambiguous, cross-subsystem, architecture-sensitive, lifecycle/integration-heavy, or high-risk work requiring deep reasoning.

Default a worker to `senior`. Tier reflects reasoning requirement, not read/write access or file count.

### Access

Use these stable access values:

- `explorer`: `read-only`.
- `worker`: `read-only` or `write` according to requested deliverable.
- `reviewer`: `read-only` by default, or `audit-write` only when a persisted review workflow provides an exact raw-review artifact path.

`audit-write` is a narrow reviewer exception, not general write access:

- repository source, implementation, plan, tests, config, and all unrelated workspace files remain read-only;
- the reviewer may create/write exactly the caller-provided raw-review artifact path and no other path;
- the reviewer may not update manifests, snapshots, execution state, adjudication, or fixes;
- the raw artifact is written once before return and becomes immutable;
- if the host cannot enforce or perform this narrow write, report a persistence blocker rather than silently broadening reviewer write authority or returning a large report solely for parent-side transcription.

For writable workers, modifications remain limited to explicit write ownership. Access follows the deliverable and never selects worker tier.

### Work type

Use one of `exploration`, `research`, `implementation`, `design`, `planning`, `analysis`, or `review`.

`exploration` pairs with `explorer`; `review` pairs with `reviewer`; other work types normally pair with `worker`. A task whose deliverable is code/file changes is `implementation` even when it starts with inspection. Root-cause, correctness, or redesign questions are `analysis` or `design`, not exploration.

## Load the host adapter

Load exactly one active-platform reference:

- Codex: `references/codex.md`
- Cursor: `references/cursor.md`
- OpenCode: `references/opencode.md`

The host reference owns concrete model mapping, invocation mechanics, platform-specific isolation, waiting/timeout behavior, and resume mechanics. Do not duplicate those details in plans or caller skills.

If the host is not covered, preserve the common semantic classification and task contract using host-native behavior that maintains isolation, bounded scope, access semantics, and same-subagent correction.

## Build the task contract

Every delegated prompt must be self-contained and minimal. Include all sections below; use `None` when empty.

```markdown
## Delegation

Role: `<explorer | worker | reviewer>`
Capability tier: `<None for explorer/reviewer | junior | senior | expert for worker>`
Access: `<read-only | write for worker | audit-write for a persisted reviewer>`
Work type: `<exploration | research | implementation | design | planning | analysis | review>`

## Required skill

Required skill: `<skill-name or None>`

If a skill is named, load and follow it before starting.

Required references:
- `<reference paths, or None>`

## Task

<State the concrete work and enough context to understand it.>

## Goal

<State the observable result or exact question.>

## Scope

Repository:
- `<workspace or repository>`

Included:
- `<files, modules, symbols, behaviors, plan sections, or diff range>`

Excluded:
- `<areas and changes outside the assignment>`

Write ownership:
- `<worker-owned paths; exact raw-review artifact for audit-write reviewer; or read-only>`

## Context

Shared contracts:
- `<only global behavior/invariants this task must preserve>`

Task-local context:
- `<relevant paths, symbols, patterns, errors, or decisions>`

Verified dependency outputs:
- `<interfaces/artifacts from predecessors, or None>`

Authority boundaries:
- `<decisions the subagent may and may not make>`

## Requirements

- `<task-specific constraints>`

## Verification

- `<focused commands, expected observations, evidence standard, or required artifact existence>`

## Return

Return all of the following:
1. Outcome: whether the Goal was achieved.
2. Work performed: bounded investigation, implementation, or review completed.
3. Evidence: relevant files, symbols, changed files, or observed behavior.
4. Verification: commands/checks and observed results.
5. Contract deviations: any scope, interface, behavior, or access difference.
6. Remaining issues: blockers, unresolved questions, or evidence limitations.

Do not return raw exploration notes, full logs, or large source excerpts unless explicitly requested. Mark material claims as `confirmed`, `inferred`, or `unverified`.
```

For an `audit-write` reviewer, the required review skill's compact return protocol overrides any generic Return item that would otherwise duplicate the full raw review. The reviewer returns verdict/status, artifact path, compact finding/violation index, and evidence limitations; the full report stays in the artifact.

Use `Required skill: None` when no applicable domain skill exists. When a skill is required, the parent reads the skill/references needed to define scope, safety, shared contracts, or verification before dispatch; the subagent independently loads them.

The task contract authority order is: task-specific requirements, referenced plan work package/shared contracts, then repository reality. Resolve conflicts before dispatch.

Self-contained does not mean exhaustive. Pass relevant shared contracts, current work package, direct dependency outputs, and for persisted reviews the exact artifact path. Do not pass parent conversation, unrelated plan sections, other work packages' implementation details, duplicated skill text, or raw discovery logs.

## Adapt to work type

Retain common Return fields, then add only work-type-specific evidence:

- **Exploration:** exact paths/symbols, flow/relationship, search coverage, and evidence limitations. Negative claims state aliases/string forms searched. No diagnosis/design/verdict.
- **Research:** sources/versions, evidence, limitations; separate external from repository facts.
- **Implementation:** files changed, behavior delivered, tests added/updated, focused commands/results, and needed-but-unperformed scope expansion. Same worker owns local implementation and focused tests.
- **Review:** direct verdict and compact issue index. When `audit-write`, the full review is persisted by the reviewer and not duplicated in the return.
- **Design/planning/analysis:** direct recommendation/judgment, evidence, and unresolved decisions.

If an explorer discovers the real question requires diagnosis/design/judgment, return gathered evidence plus that boundary. The parent may dispatch a worker with appropriate tier.

## Dispatch and collect

1. Classify role, tier, access, and work type. Enforce `explorer → None + read-only + exploration`; `reviewer → None + read-only|audit-write + review`; `worker → junior|senior|expert` with read-only/write as required.
2. Load the active host adapter and apply it. Put only bounded task context in the contract.
3. Dispatch ready work concurrently only when dependency outputs are stable, write ownership does not overlap, and no shared interface remains unsettled. Two audit-write reviewers may run concurrently only when their artifact paths are distinct.
4. Wait for every result in the current wave and verify task contract, actual edits/artifacts, and focused checks before releasing dependent work.
5. Reject scope/access violations. A subagent that discovers a necessary out-of-scope edit returns it as a blocker instead of making it.
6. If a response violates contract or verification finds an error, resume the same subagent with failed requirement, concrete evidence, and exact correction. Do not silently spawn a replacement.
7. Do not wait indefinitely on a stalled subagent. Apply host waiting rules. For optional scouting/critique, verify directly and disclose limitation; for a required deliverable, complete under parent when safe or report the blocker.
8. If the original subagent is no longer resumable, report that limitation rather than silently replacing it.
9. Keep the parent grounded in load-bearing repository facts. Compact summaries reduce context but do not replace independent verification of public interfaces, data/security boundaries, negative claims, integration behavior, or final acceptance.
