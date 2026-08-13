---
name: review-plan-conformance
description: Verify that a code patch delivers the behavior promised by a saved implementation plan. Use after implementation when a plan file exists; remain read-only and review conformance rather than general patch quality.
---

# Review plan conformance

Determine whether a patch delivers the behavior its plan promised. Judge intent, not wording: a plan is implemented when the system now behaves as promised, regardless of the internal names and structures used.

## Inputs

`Plan File` is required. Review the current workspace and uncommitted changes unless the caller names a different repository or diff range. `Scope` may narrow the reviewed plan sections and `Custom Instructions` may add constraints. If the plan is missing or unreadable, stop and ask for it. Never substitute an inferred plan.

## Scope

Review conformance between plan and implementation. Use `review-patch` to hunt for defects the plan never addressed and `review-plan` to judge the plan itself. Do not implement or repair anything.

## Normalize the plan

Read the complete plan, then restate it as behavioral contracts: observable behaviors, invariants, prohibitions, and responsibility boundaries.

- Harvest contracts from the entire document, including context, rationale, assumptions, and contingencies.
- Treat literal names, signatures, fields, and deletion lists as means unless a contract or user-facing interface depends on them.
- Record each contract's plan section and ordered dependencies.

## Procedure

1. Normalize the plan into the contract checklist.
2. Read the diff to map what changed, then compare the checklist with current code rather than merely matching diff text.
3. Verify each contract by behavior, including the negative path and a test that would fail on regression when applicable.
4. For prohibitions, enumerate every call site or route that could still produce the forbidden effect.
5. Once the checklist and diff map exist, use `delegate-work` for independent read-only behavioral traces and bypass sweeps when that materially improves coverage.
6. Verify plan-mandated tests exist and assert the contract. Do not run them.
7. Sweep the diff for changes no contract explains and list them without judging correctness.
8. Report the earliest blocking violation first and mark downstream consequences.
9. Do not edit files, run builds or tests, or trigger state-changing commands.

## Evidence standard

A matching symbol or diff mention does not prove conformance. Each satisfied contract needs behavioral evidence: a code path with file and line references, the negative-case branch, or a regression test.

Assign exactly one status per contract:

- `satisfied`: behavior present, with evidence
- `violated`: behavior absent, incomplete, or reachable by a forbidden route
- `satisfied-differently`: behavior present through means the plan did not describe
- `unverifiable`: confirmation requires runtime, hardware, or external services

Confirm every `violated` status and every bypass-free claim with your own search, including alias and string forms. Absence is easy to misjudge.

## Delegation

Scouts locate and trace; the reviewing agent judges every status and owns the verdict.

- Give each scout one behavioral question or bypass sweep using the full task contract from `delegate-work`.
- Run only independent, non-overlapping partitions concurrently and wait for every required result.
- Never record `violated` or “no bypass exists” from scout evidence alone.
- If a scout result is unusable, resume it with the missing return requirements or verify that partition directly.

## Output

Start with `CONFORMS`, `DIVERGES`, or `INCOMPLETE`, a 1–3 sentence explanation, and confidence from 0.0 to 1.0.

Then provide:

- Coverage: per plan section, counts by status, and any unreviewed section.
- Violations: grouped by plan section, earliest blocking one first. Give the contract, promised behavior, actual behavior and evidence, impact, and one remedy.
- Accepted deviations: one line for each `satisfied-differently` contract.
- Out-of-plan changes: changes no contract explains, listed without judging them.

State which contracts relied on delegated scout evidence. If coverage is incomplete, name the uncovered sections rather than presenting a partial review as complete.
