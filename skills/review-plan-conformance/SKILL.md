---
name: review-plan-conformance
description: Verify that an implementation delivers the behavior promised by a saved plan. In persisted review cycles, write the full raw conformance report directly to the caller-provided audit artifact and return only a compact control result.
---

# Review plan conformance

Determine whether an implementation delivers the behavior its plan promised. Judge intent, not wording: a plan is implemented when the system now behaves as promised, regardless of internal names and structures used.

## Inputs and authority

`Plan File` is required. Review the current workspace and uncommitted changes unless the caller names a different repository or diff range. Optional inputs:

- `Scope`
- `Custom Instructions`
- `Execution ID`
- `Review Round` from 1 through 3
- `Review Scope`: `workspace | commit-range | workspace-and-commits`
- `Reviewed Head`
- `Diff Base`
- `Diff Head`
- `Raw Review Artifact`: exact path for the immutable full report

If `Review Round` is above 3, stop without reviewing and report that the cycle requires user direction. If the plan is missing or unreadable, stop and ask for it. Never substitute an inferred plan.

Remain source-read-only: do not edit implementation files, tests, configuration, or the plan; do not run builds/tests or state-changing commands. When `Raw Review Artifact` is provided, you have exclusive write authority only for that one new audit file. Do not update manifests, execution state, adjudication, or any other audit artifact. The caller owns persistence outside the raw report, adjudication, fixes, and reruns.

## Scope

Review conformance between plan and implementation. Use `review-patch` to hunt defects the plan never addressed and `review-plan` to judge the plan itself. Do not implement or repair anything.

## Normalize the plan

Read the complete plan, then restate its material promises as behavioral contracts: observable behaviors, safety/data/compatibility properties, failure semantics, prohibitions, public interfaces, and responsibility boundaries.

- Harvest rationale, assumptions, or contingencies only when they constrain a material observable result or responsibility boundary.
- Explanatory reasoning, bookkeeping, source anchors, exact test counts, and local implementation suggestions are not contracts.
- Treat literal names, signatures, fields, deletion lists, and ownership instructions as means unless a user-facing/public interface, compatibility rule, prohibited path, or cross-package responsibility depends on them.
- Record each contract's plan section and ordered dependencies.
- Preserve an existing contract identifier from the plan when one exists. Otherwise assign stable report-local IDs `PC-01`, `PC-02`, ... in plan order.

## Procedure

1. Normalize the plan into the contract checklist.
2. Read the diff to map what changed, then compare the checklist with current code rather than merely matching diff text.
3. Verify each contract by behavior, including the negative path and a test that would fail on a plausible material regression when applicable.
4. For prohibitions, enumerate every call site or route that could still produce the forbidden effect.
5. Use `delegate-work` for independent read-only behavioral traces and bypass sweeps when that materially improves coverage.
6. Verify plan-mandated tests exist and assert the material contract. Do not run them; this reviewer is read-only.
7. Sweep the diff for changes no contract explains and list them without judging correctness.
8. Report the earliest blocking violation first and mark downstream consequences.
9. Confirm every `violated` status and every bypass-free claim yourself; explorers supply evidence but never own status or verdict.

## Evidence standard

A matching symbol or diff mention does not prove conformance. Each satisfied contract needs behavioral evidence: a code path, negative-case branch, or regression test. Exact internal structure is unnecessary when current behavior proves the promise.

Assign exactly one status per contract:

- `satisfied`: behavior present, with evidence
- `violated`: behavior absent, incomplete, or reachable by a forbidden route
- `satisfied-differently`: behavior present through means the plan did not describe
- `unverifiable`: confirmation requires runtime, hardware, external services, or human evidence genuinely unavailable to this review

For every `violated` contract assign exactly one violation type:

- `missing-implementation`
- `partial-implementation`
- `forbidden-path-remains`
- `missing-negative-path`
- `missing-regression-test`
- `behavioral-mismatch`
- `responsibility-boundary`
- `compatibility-migration`

Do not assign a violation type to other statuses.

## Verdict

Use:

- `CONFORMS`: no material violated contract and material coverage is assessable.
- `DIVERGES`: at least one material contract is violated.
- `INCOMPLETE`: a material contract genuinely cannot be assessed because necessary runtime, hardware, external-service, or human evidence is unavailable.

Do not use `INCOMPLETE` merely because this read-only reviewer did not rerun automated checks.

## Full raw report

The complete report contains:

1. `CONFORMS`, `DIVERGES`, or `INCOMPLETE`, 1–3 sentence explanation, confidence 0.0–1.0.
2. **Coverage:** counts by status per plan section and any unreviewed section.
3. **Contract results:** every material contract with stable ID, plan section, status, and concise behavioral evidence.
4. **Violations:** every violated contract, earliest blocking first, with contract ID, violation type, promised behavior, actual behavior/evidence, impact, and one remedy.
5. **Accepted deviations:** every `satisfied-differently` contract.
6. **Out-of-plan changes:** changes no contract explains, listed without judging correctness.
7. Delegated evidence used and evidence limitations.

Preserve the full contract coverage table in the raw artifact even though only violations need to return to the parent control plane.

## Persisted-cycle output protocol

When `Raw Review Artifact` is supplied:

1. Complete the review.
2. Write the entire raw report directly to that exact path before returning. The artifact becomes immutable after return.
3. Include provenance frontmatter:

```markdown
---
execution_id: <provided execution id>
round: <N>
reviewer: review-plan-conformance
reviewed_head: <sha>
review_scope: <workspace | commit-range | workspace-and-commits>
diff_base: <sha/ref or null>
diff_head: <sha/ref or WORKTREE>
reviewer_skill_sha256: <digest or unknown>
reviewer_model: <host-reported identifier or unknown>
reviewer_reasoning: <host-reported value or unknown>
started: <timestamp>
completed: <timestamp>
verdict: <CONFORMS | DIVERGES | INCOMPLETE>
confidence: <0.0-1.0>
---

# Raw plan conformance review

<complete raw report>
```

Do not return the full coverage table after it has been persisted. Return only:

```text
Outcome: review completed
Verdict: <CONFORMS | DIVERGES | INCOMPLETE>
Confidence: <0.0-1.0>
Artifact: <Raw Review Artifact>
Violations:
- <contract-id> | <violation type> | <one-line summary>
- ...
Coverage summary: <satisfied N; satisfied-differently N; violated N; unverifiable N>
Evidence limitations: <one-line summary or None>
```

The compact violation index must include every `violated` contract. Do not return satisfied-contract evidence to the parent; it remains in the artifact for audit and on-demand reads.

If the raw artifact write fails, report the persistence failure and do not claim the round completed. Do not send the full report merely so the caller can persist it for you.

When `Raw Review Artifact` is not supplied, behave as a standalone advisory reviewer and return the full report normally; do not create audit files.
