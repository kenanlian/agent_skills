---
name: delegate-work
description: Delegate a bounded coding task to a platform-built-in subagent using a complete task contract. Use when work should run in a separate context or in parallel, and the subagent must load a specific domain skill.
---

# Delegate work

Use platform-built-in subagents only. Do not require custom subagent definitions from this repository.

## Select the built-in subagent

Choose from the current host platform:

| Work type | Codex | Cursor |
| --- | --- | --- |
| Read-only exploration, review, or research | `explorer` | `Explore` |
| Implementation, file changes, or test writing | Prefer `worker`; use `default` when broader general-purpose coordination is required or `worker` is unavailable | `generalPurpose` |

If the named built-in is unavailable, use the closest host-provided built-in with the same work type. Do not create a custom subagent as a fallback.

## Build the task contract

Every delegated prompt must be self-contained because a subagent may start with no conversation history. Include every section below; use `None` rather than silently omitting a section that has no content.

```markdown
## Required skill

Load and follow the discovered `<skill-name>` skill before starting. Treat it as the task-specific workflow and output authority.

## Task

<State the concrete work to perform and enough context to understand it.>

## Goal

<State the observable end result or exact question to answer.>

## Scope

Repository:
- `<workspace or repository>`

Included:
- `<files, directories, symbols, behaviors, plan sections, or diff range>`

Excluded:
- `<areas and changes outside the assignment>`

Relevant inputs:
- `<plan path, issue, errors, commands, references, or other anchors>`

## Requirements

- `<task-specific constraints and required checks>`

## Return

Return all of the following:
1. Outcome: a direct conclusion or completion status.
2. Work performed: the investigation, implementation, or tests completed.
3. Evidence: relevant files, symbols, line references, changed files, or observed behavior.
4. Verification: commands or checks run and their observed results.
5. Remaining issues: blockers, unresolved questions, or evidence limitations.

Do not return raw exploration notes unless explicitly requested.
```

Make the task and goal concrete enough that success is decidable. Make scope boundaries explicit enough that the subagent does not need to infer ownership. Tailor the Return section when the domain skill requires a stricter output format, while retaining outcome, evidence, verification, and remaining issues.

## Dispatch and collect

1. Name the required domain skill explicitly; do not ask the subagent to guess it.
2. Put all context needed for the bounded task in the task contract. Do not rely on the parent conversation.
3. Dispatch independent work concurrently only when scopes do not overlap or depend on unsettled results.
4. Wait for every required result before integrating dependent work.
5. Check each response against the Return contract. Resume the same subagent with the missing items when its response is incomplete.
6. The parent agent owns task decomposition, cross-task decisions, integration, and the final answer.
