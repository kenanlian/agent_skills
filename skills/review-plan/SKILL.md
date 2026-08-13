---
name: review-plan
description: Review an implementation plan for executability, source grounding, decision completeness, and verifiable acceptance criteria. Use before executing a saved plan; remain advisory and do not edit the plan or code.
---

# Review plan

Determine whether the plan file, on its own, carries an implementer from start to verified result without rediscovering facts or settling decisions the plan should have settled.

## Inputs

`Plan File` is the only required input: a path to the plan under review. Read that file yourself and review the plan as written, not as the caller summarized it. Review it against the current workspace repository unless the caller names a different one. `Scope` may narrow which plan sections to review, and `Custom Instructions` may add constraints.

If the plan file is missing or unreadable, or the caller supplied only a request, summary, or inline sketch instead of a path, stop and ask for the file. Never review a plan reconstructed from conversation, codebase, or diff.

## Scope

Review the plan, its referenced project state, and its verification strategy. Do not implement or rewrite the plan, judge a proposed architecture merely because another is preferable, or review a code diff. Use `review-patch` for implementation review.

## Procedure

1. Read the complete plan. Identify its stated outcome, scope boundaries, dependencies, decisions, tasks, and verification criteria.
2. Verify referenced files, symbols, interfaces, tests, and existing patterns against the current codebase. Separate preconditions from products created by earlier plan steps. Search alias and string forms before reporting an assumed-existing reference as missing.
3. Check that each task has an executable entry point, correct ordering, explicit dependencies, and a clear done condition.
4. Check that every implementation choice affecting behavior, structure, interfaces, data, verification, compatibility, security, external dependencies, or irreversible changes is settled in the file rather than deferred to the implementer.
5. Check that verification covers intended observable behavior, relevant failure paths, and concrete commands or actions with expected results.
6. When focused read-only scouting materially improves verification, follow `delegate-work`. Scouts locate and trace; never delegate a required-revision decision or the verdict.
7. Do not edit files, run builds or tests, or trigger state-changing commands.

## Review standard

The bar is absolute: a competent implementer who never saw the originating conversation opens the file, executes it top to bottom, and makes zero design decisions. Anything that lives only in conversation, in the caller's head, or in the reviewer's investigation is absent from the plan.

Request revision when the implementer would have to settle something the file left open, rediscover an omitted fact, or guess what done means. Each required revision must identify:

- the plan section or task;
- the codebase evidence;
- why the gap blocks implementation or verification;
- the exact decision or information needed; and
- a concrete suggestion worded so it can be inserted into the plan.

Ground suggestions in the evidence and the design the plan already settled. When multiple resolutions remain defensible, recommend one and name the alternative briefly rather than presenting a menu to the implementer.

## Output

Start with `APPROVE` or `REVISE`.

Then provide:

- Summary: 1–3 sentences on executability and the most important evidence.
- Required revisions: blocking gaps grouped by plan task or section. Omit when approving. End each entry with a concrete `Suggestion:` line.
- Non-blocking risks: at most two observations that do not change the verdict.

When approving, state which source references and verification criteria were checked. When revising, let no entry end in a bare request for more detail or a preferred redesign of an already workable choice.
