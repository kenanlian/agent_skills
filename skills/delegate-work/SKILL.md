---
name: delegate-work
description: Delegate bounded exploration, implementation, review, design, or research to a platform-built-in subagent using an isolated, self-contained task contract. Use when work should run in a separate context, serially through a specialist, or in parallel.
---

# Delegate work

Use platform-built-in subagents only. Do not require custom subagent definitions from this repository.

The parent agent is the control plane: it owns decomposition, shared contracts, cross-task decisions, integration, verification, and the final answer. Subagents perform bounded work; serial work may still be delegated when its inputs are stable and its result is independently verifiable.

## Require a bounded task

Delegate only when the assignment has all of these properties:

- one concrete goal whose success is decidable;
- explicit included and excluded scope;
- stable inputs and no unresolved cross-task interface decision;
- an ownership boundary that prevents concurrent write conflicts;
- a focused verification method or a concrete evidence standard; and
- a result that can be returned as a compact conclusion rather than raw working notes.

If the assignment needs several unrelated subsystems, changes a shared contract while consumers are still unsettled, or requires a long narrative to explain its completion state, split or resolve it before dispatch. Parallelism is optional; boundedness is mandatory.

## Select and isolate the built-in subagent

Classify the task by its requested deliverable, then apply the matching host rule. Treat a task whose deliverable is code or file changes as implementation even when it must first inspect the codebase. Keep model names in this routing table rather than embedding them in plans or task DAGs.

### Codex

Always spawn with `fork_turns: "none"`. Put all necessary context in the task contract; never fork or otherwise pass the parent agent's conversation context.

| Work type | Model | Reasoning effort |
| --- | --- | --- |
| Codebase exploration or external-information research | `gpt-5.6-terra` | `high` |
| Code implementation, file changes, or test writing | `gpt-5.6-sol` | `medium` |
| Review, design, planning, analysis, or any other task | `gpt-5.6-sol` | `high` |

### Cursor

Always use the built-in `generalPurpose` subagent. Rely on Cursor's isolated subagent context and provide the complete task contract; never rely on or attempt to pass the parent conversation.

| Work type | Model |
| --- | --- |
| Codebase exploration or external-information research | `cursor-grok-4.6-high` |
| Code implementation, file changes, or test writing | `cursor-grok-4.6-high` |
| Review | `gpt-5.6-sol-high` |
| Design | `claude-opus-5-thinking-high` |

For other Cursor tasks, keep `generalPurpose` and use the host-selected model unless the user specifies one. Do not create a custom subagent as a fallback.

## Build the task contract

Every delegated prompt must be self-contained and minimal because a subagent may start with no conversation history and has its own finite context. Include every section below; use `None` rather than silently omitting a section that has no content.

```markdown
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

## Adapt the return to the role

Retain the common Return fields, then add only the role-specific evidence:

- **Exploration or research:** answer one explicit question; return exact paths, symbols, source versions, search coverage, and evidence limitations. A claim that no other caller, route, or reference exists must state the aliases and string forms searched.
- **Implementation:** return files changed, behavior delivered, tests added or updated, focused commands with observed results, and any scope expansion that was needed but not performed. The same subagent owns its local implementation and focused tests.
- **Review, design, or planning:** return a direct verdict or recommendation, findings with triggers and evidence, and unresolved decisions. Scouts may locate evidence, but the reviewing or designing agent owns its judgment.

## Dispatch and collect

1. Name the required domain skill or `None`; do not ask the subagent to guess.
2. Put only the context needed for the bounded task in the contract. In Codex, set `fork_turns: "none"` explicitly.
3. Dispatch ready work concurrently only when dependency outputs are stable, write ownership does not overlap, and no shared interface remains unsettled. A dependent task may be delegated serially after its predecessor is verified.
4. Wait for every result in the current wave and verify its contract, actual edits, and focused checks before releasing dependent work.
5. Reject and correct any scope violation. A subagent that discovers a necessary out-of-scope edit returns it as a blocker instead of making it.
6. If a response violates the contract or verification finds an error, do not spawn a replacement. Resume that same subagent with the failed requirement, concrete evidence of the problem, and the exact correction required. Repeat verification and resume until the result passes or the same subagent cannot proceed.
   - Codex: call `followup_task` with the existing subagent path or task name. Do not use `send_message`, because it does not start a new turn.
   - Cursor: call the `Task` tool with its `resume` parameter set to the existing `generalPurpose` subagent ID. Supply the correction as the new prompt; do not omit `resume` or start a new subagent.
7. Do not wait indefinitely on a stalled subagent. Interrupt it when it has exceeded a reasonable window for its bounded task. For optional scouting or critique, verify that partition directly and disclose the limitation; for a required deliverable, complete it under the parent agent when safe or report the exact blocker. Never spawn a silent replacement.
8. If the original subagent is no longer resumable, report that as a blocker rather than silently creating a new one.
9. Keep the parent agent grounded in load-bearing repository facts. Summaries reduce noise but do not replace independent verification of public interfaces, data and security boundaries, negative claims, integration behavior, or final acceptance.
