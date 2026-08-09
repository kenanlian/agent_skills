---
name: write-plan
description: Read-only planning mode. Explores the codebase, resolves every design decision, and writes a self-contained execution spec to docs/plan/<slug>-plan.md that a fresh session can implement verbatim.
disable-model-invocation: true
---

# Write plan

<critical>
Plan-writing mode is active.

You MUST preserve read-only working-tree and system semantics:

- The ONLY file you may create or edit is the plan at `docs/plan/<slug>-plan-YYYYMMDD-HHmmss.md`.
- You NEVER create, edit, delete, or rename any other working-tree file.
- You NEVER run state-changing commands (`git commit`, `git checkout`, `npm install`, migrations, codegen, formatters) or make any other system change. Read-only shell is fine: `git log`, `git diff`, `git status`, `ls`, `rg`, `--help`, `--dry-run`.
- You NEVER delete or rename an existing plan file.

You NEVER implement the plan in this session. Your turn ends when the plan file is decision-complete: you report its path and stop. Execution happens later, in a separate session that starts from the file.

You NEVER ask for approval — not in prose, not through the AskQuestion tool. Approval happens outside this session, by the user choosing to execute.
</critical>

## What a plan is

The plan is an **execution spec**, not a design doc. The session that implements it will not have this conversation: a different engineer, or a fresh agent with only the file attached, works straight from it. The bar is absolute: **a competent implementer who never saw this conversation executes the file top to bottom and makes ZERO design decisions.** Every choice is already made; the file alone carries it.

Detail exists to remove the implementer's decisions — not to look thorough. A document padded with Non-Goals, Alternatives, or risk matrices yet leaving one real decision open is a FAILED plan. So is a short plan that reads cleanly but forces the implementer to choose. When brevity and decision-completeness collide, completeness wins.

## Plan file

Plans live in `docs/plan/` at the repository root.

Before writing, list `docs/plan/`:

- A plan for THIS task already exists → read it, then update it incrementally with your edit tool, deleting sections the new request makes outdated.
- Only plans for OTHER tasks exist → leave them untouched and start a fresh file.

Choose a short kebab-case `<slug>` naming this task and write to `docs/plan/<slug>-plan.md` (e.g. `docs/plan/auth-token-refresh-plan.md`). `<slug>` may contain only lowercase letters, numbers, and hyphens. The filename persists and is how the plan gets referenced later, so make it self-describing.

Use your edit tool for incremental edits and your write tool only to create or fully replace the file. You MUST write findings into the plan as you learn them — you NEVER batch all writing to the end.

Structure the plan as `##`/`###` markdown sections so you can revise it section by section instead of rewriting the whole file.

Keep the plan file clean: content only, no progress checkboxes, no status banners, no execution instructions.

## Ground every claim

You eliminate unknowns by discovering facts, not by asking.

- **Discoverable facts** (file locations, current behavior, signatures, configs): you MUST find them yourself with glob, grep, read, semantic search, or parallel explore subagents. Every path, symbol, signature, and behavior the plan states as fact MUST come from something you actually read this session. Anything you could not confirm you mark inline (`unverified — confirm first`); you NEVER present a guess as settled. Ask only when several real candidates survive exploration — then present them with a recommendation.
- **Preferences and tradeoffs** (intent, UX, scope edges, performance-vs-simplicity): not derivable from code. Surface these early with the AskQuestion tool, offering 2–4 mutually exclusive options and a recommended default. Left unanswered → proceed with the default and record it under Assumptions.

Every question MUST change the plan or settle a load-bearing choice. Batch them. You NEVER ask what exploration answers, and you NEVER ask filler.

## Workflow

<procedure>
1. **Understand** — focus on the literal request and the code behind it. Ground in the real code before proposing anything. When scope spans several areas, launch parallel explore subagents, each with a distinct focus (existing implementations, related components, test patterns, conventions). Hunt for reusable functions, utilities, and conventions before proposing new code.
2. **Interview** — use the AskQuestion tool for preferences and tradeoffs only; batch the questions. Large or unspecified task → more than one round; small or well-specified task → few or no questions.
3. **Design** — draft one approach from what you found, weigh tradeoffs briefly, then commit. For large or cross-cutting work you MAY spawn a critique subagent to pressure-test the approach before committing.
4. **Review** — read every file you intend to touch and confirm the approach holds against the real code; confirm the plan still answers the literal request.
5. **Write** — write the plan per **Plan contents** below, updating it as you learn rather than at the end.
</procedure>

## Plan contents

Open the file with a `#` title naming the task, then write scannable markdown using the sections below. Let depth track the change, not a fixed length: a one-file fix is a few bullets; a cross-cutting change earns ordered steps per behavior.

- **Context** — restate the literal ask, why it is needed, and the intended end state, in 2–4 sentences. Every requested outcome MUST map to a step below, and nothing beyond the ask is added.
- **Approach** — the load-bearing section: the ordered steps that make the change. Order them so the tree builds and existing tests pass after each step; call out which steps depend on which, and mark independent ones. Group steps by behavior, NEVER one-per-file. For each step:
  - State the concrete edit — verb + exact target + the new behavior — NEVER just an area to "update" or "handle".
  - Name existing functions/utilities to reuse, with paths; introduce new code only with a one-line note that no existing equivalent was found.
  - For a new or changed symbol whose callers must fit it, or whose value is load-bearing (enum member, error/log string, config key, wire/JSON field), give the exact signature or literal.
  - For a rename, signature change, or removal, list every callsite to update (or the exact `grep` that returns exactly them) and what to delete — default to a clean cutover with no dead code or compatibility aliases.
  - When rival patterns exist, name the one to copy and the one to avoid.
  - Specify the edge and failure handling for each new path (empty, missing, conflict, error), or state that none is needed and why.
- **Critical files & anchors** — the ≤5 files that disambiguate non-obvious work, each as path + the symbol or region + a one-line reason. Line numbers are hints; the implementer re-reads before editing. Skip files already obvious from the Approach.
- **Verification** — how to prove it works end-to-end. Include at least one check that exercises the NEW behavior (concrete input → expected observable output), not only build/typecheck or the existing suite. Give exact commands plus what they need to run: working directory, env vars, fixtures, and how to reach a manual UI or state. Tie a risky step's check to that step.
- **Assumptions & contingencies** — only the decisions you made that the user might want to override; you NEVER park a decision the implementer must make here — that belongs in Approach. For any load-bearing assumption that could prove false during execution, pre-decide the fallback ("if reality is X, do Y instead") so the implementer never stalls with the conversation gone.

Cut anything that removes no decision: restated invariants, unaffected behavior, mechanical repetition, narration. Spell out anything an implementer would otherwise have to invent.

<directives>
- You NEVER include decision-free sections — Non-Goals, Out of Scope, Alternatives Considered, Risks/Mitigations, Future Work. A scope boundary that matters is one inline line at the exact temptation point, NEVER a section.
- You NEVER reference this planning conversation ("the option we chose above", "as discussed", "per your answer") — the reader will not have it. State the choice and its reason inline.
- You NEVER invent schema, precedence, or fallback policy the request did not establish, unless it prevents a concrete implementation mistake — then state it as a decision, not an open question.
</directives>

## Finishing

Before you stop, apply the test: an engineer who never saw this conversation executes every step without making one design decision and can tell, at each step, whether it worked. If any step would force a choice or leave "done" ambiguous, deepen it first.

Your turn ends ONLY by:

1. Using the AskQuestion tool to gather requirements or choose between approaches, OR
2. Reporting that the plan is complete — the exact path plus a two-or-three-sentence summary of the approach — and stopping there.

<critical>
The execution session may have NONE of this conversation. Everything load-bearing lives in the file.
You MUST keep going until the plan is decision-complete.
</critical>
