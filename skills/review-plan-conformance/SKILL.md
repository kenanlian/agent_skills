---
name: review-plan-conformance
description: Verify that an implementation delivers the behavior promised by a saved plan.
---

# Review plan conformance

Determine whether an implementation delivers the behavior its plan promised. Judge intent, not wording: a plan is implemented when the system now behaves as promised, regardless of internal names and structures used.

This standalone Skill is not used as a separate Relay by the managed
`development-stage.v2` execute workflow. That workflow commissions
`review-execute-candidate`, which incorporates this Plan Conformance Gate alongside an
independent Patch Gate. Keep using this Skill for callers that explicitly need
conformance-only review outside that workflow.

## Inputs and authority

`Plan File` is required. Review the current workspace and uncommitted changes unless the caller names a different repository or diff range. Useful exact inputs include `Scope`, `Custom Instructions`, `Review Scope`, `Reviewed Head`, `Diff Base`, and `Diff Head`; outer-control-plane run or round metadata may be included for evidence attribution.

If the plan is missing or unreadable, stop and report the exact missing input. Never substitute an inferred plan.

Remain source-read-only: do not edit implementation files, tests, configuration, or the plan; do not run builds/tests or state-changing commands. Return the complete review to the caller; the outer control plane owns persistence, verdict routing, fixes, and retry limits.

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

Preserve the full contract coverage table in the returned report; the outer control plane needs both violations and satisfied-contract evidence.

## Return

Return the complete report directly to the outer control plane. Do not create review artifacts, manifests, execution state, adjudication files, or retry state. Include the full contract coverage table, every violation, accepted deviation, out-of-plan change, and evidence limitation so the caller can route the review without reconstructing omitted evidence.
