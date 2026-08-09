---
name: agent-orchestration
description: Executes an existing implementation plan by splitting it into todos and delegating bounded work to specialized Cursor subagents. Use after a plan already exists, to coordinate parallel and serial subagent delegation through completion.
disable-model-invocation: "true"
---
# Agent orchestration

Execute an implementation plan that already exists. Act as the sole coordinator: own the todo list, task ordering, delegation, and final delivery. Delegate bounded work; do not delegate coordination.

This skill assumes an implementation plan is already in hand. It does not create or review plans. Its job is to turn that plan into todos and drive them to completion through subagent delegation.

## Workflow

1. Split the plan into todos.
2. Delegate each todo to the right subagent, parallel when possible and serial when not.
3. Run the completion gate check as the final todo.

## 1. Split the plan into todos

Break the plan into bounded, independently verifiable todos with the `TodoWrite` tool.

- Each todo is one coherent unit of work with a clear deliverable.
- Order todos by dependency: a todo that consumes another todo's output comes after it.
- Mark which todos are independent (can run in parallel) versus dependent (must run serially).
- Always add a final todo: **Completion gate check** (see below).

## 2. Delegate todos to subagents

### Route by task type

Pick the subagent that matches the todo:

| Todo type                                                              | Subagent               |
| ---------------------------------------------------------------------- | ---------------------- |
| Explore the codebase (structure, call paths, patterns, test locations) | `explorer-agent`       |
| Regular implementation, debugging, or refactor                         | `task-agent`           |
| Research an external library, framework, or API                        | `librarian-agent`      |
| UI / UX behavior or visual design work                                 | `designer-agent`       |
| Review patch-introduced correctness, integration, or security defects  | `patch-reviewer-agent` |

Use the smallest set of subagents that materially improves correctness. Do not summon every agent by default.

### Parallel vs. serial

- Delegate independent todos in parallel: issue multiple subagent calls in a single batch.
- Delegate dependent todos serially: wait for the upstream todo's result before starting the downstream one.
- Read-only agents (`explorer-agent`, `librarian-agent`, `patch-reviewer-agent`) may run in parallel whenever their questions are independent.
- Writing agents (`task-agent`, `designer-agent`) may run in parallel only when their file sets and interfaces are explicitly non-overlapping. Otherwise schedule them serially.

## Delegation contract

Every delegated prompt must state:

```text
TASK: one bounded objective
SCOPE: permitted files or systems, plus explicit exclusions
CONTEXT: verified facts, user decisions, and relevant paths
DELIVERABLE: the exact report, plan, implementation, or review outcome
VERIFY: evidence or checks the child must provide
```

Main-agent rules:
- You own fan-out. Do not ask a child to coordinate other children unless explicitly necessary.
- Treat subagent reports as claims until checked against their cited evidence, outputs, or the resulting diff.
- Give each child only the context it needs. Do not dump the full conversation.
- Use read-only agents in parallel only for independent questions.
- Run writing agents in parallel only when their file sets and interfaces are explicitly non-overlapping.
- `task-agent` executes directly and does not delegate.

## Handling subagent results

Verification is phased: per-todo uses fast objective signals; the full chain and semantic review run once at the end.

### Per-todo verification (fast gate)

After a `task-agent` or `designer-agent` reports, before marking the todo complete:
- Read the report and confirm it covers the todo's deliverable; check `git diff --stat` so the changes land in the expected files and do not cross architecture guardrails (`pipeline.ts` sole projection path, `main.ts` default open behavior, search blocked-state gating, stale async generation guards, i18n en/zh dual paths).
- Run `npm run check` plus the focused tests relevant to the changed files, e.g. `npx vitest run src/view/Toolbar.svelte.test.ts` for a Toolbar change. Do not run `npm run build` or the full `npm test` suite per todo.
- Only read the diff line-by-line for contract-relevant fragments that tests cannot judge (type signatures, projection order, generation guards). Prefer objective signals over manual line reading.
- If a signal fails, return the todo to the responsible worker as a follow-up before marking it complete.

### Full verification (deferred to completion gate)

The full chain and `patch-reviewer-agent` run once during the completion gate, not per todo:
- A patch finding with a local implementation remedy → return to the responsible worker as a follow-up todo.
- A finding that invalidates a plan assumption → surface it to the user; this skill does not silently re-plan.

## 3. Completion gate

Run this as the final todo, after all implementation todos passed their per-todo gate. In order:

1. Run the full validation chain once:

```
npm run check && npm run check:svelte && npm run build && npm test
```

2. Submit the completed diff (relative to the branch's divergence point) to `patch-reviewer-agent`, directing it at this project's architecture guardrails (`pipeline.ts` sole projection path, `main.ts` default open behavior, search blocked-state gating, stale async generation guards, i18n en/zh dual paths).

3. Resolve any patch findings per the "Handling subagent results" rules.

Before declaring work complete, confirm:
- the requested observable behavior was verified;
- the full validation chain passed;
- required patch review is resolved;
- the final report distinguishes verified results from residual risk.

Do not rerun successful checks or re-poll completed work without a concrete reason. Stop after the completion gate passes.