---
name: review-patch
description: Review a code patch for introduced correctness, integration, security, and test defects.
---

# Review patch

Identify patch-introduced bugs that are reachable and have concrete user or system impact. Review the patch first, then read sufficient surrounding code to prove each finding.

This standalone Skill is not used as a separate Relay by the managed
`development-stage.v2` execute workflow. That workflow commissions
`review-execute-candidate`, which incorporates this Patch Gate alongside an independent
Plan Conformance Gate. Keep using this Skill for callers that explicitly need patch-only
review outside that workflow.

## Inputs and authority

The caller supplies the implementation scope as a workspace, diff, or commit range plus the intended behavior. Useful exact inputs include `Review Scope`, `Reviewed Head`, `Diff Base`, and `Diff Head`; outer-control-plane run or round metadata may be included for evidence attribution.

If the scope or intended behavior is missing or ambiguous, stop and report the exact missing input. Perform one review and never initiate a rerun yourself.

Remain source-read-only: do not edit implementation files, tests, configuration, plans, or any other workspace file; do not run builds/tests or state-changing commands. Return the complete review to the caller; the outer control plane owns persistence, verdict routing, fixes, and retry limits.

## Scope

Review the implementation that changed, not the proposal that preceded it. Do not redesign an approved plan, report unrelated technical debt, or request features outside the stated change unless the patch breaks an existing or stated contract.

## Procedure

1. Inspect the relevant diff, determine the intended behavioral change, and read every changed hunk in context.
2. Trace changed public values, events, commands, messages, frames, schemas, and enum variants to their consumers. Verify they are handled rather than silently dropped.
3. Check changed error paths, state transitions, cleanup, authorization boundaries, compatibility behavior, and concurrent or repeated execution when applicable.
4. Inspect relevant tests. Report a test gap only when a concrete material defect in changed behavior could plausibly pass existing checks.
5. When focused tracing materially improves coverage, follow `delegate-work` and give each read-only explorer one bounded evidence question.
6. Confirm every blocking finding yourself. Explorers supply evidence; this reviewer owns priority, category, finding, and verdict.

## Finding criteria

Report P0–P2 only when all are true:

- the patch introduced or exposed the issue;
- supported input, normal operation, credible failure, or realistic concurrent/repeated action can trigger it;
- it has concrete user, data, security, compatibility, reliability, integration, or material performance impact;
- affected behavior is within the patch contract or established system behavior;
- it has a discrete remedy within reasonable patch scope; and
- it does not rely on an unstated product preference.

P3 is only for a patch-introduced, reachable, concrete low-impact correctness concern useful as an advisory. Do not report style, maintainability alone, exact source-location drift, unreachable adversarial constructs, pre-existing technical debt, theoretical risk without a credible route, or a merely preferable design.

Use priorities:

- `P0`: release-blocking or universal severe impact
- `P1`: high-impact defect needing prompt correction
- `P2`: reachable defect with meaningful user-visible, integration, reliability, compatibility, or bounded data impact
- `P3`: reachable low-impact correctness concern safe to ship as advisory

Assign exactly one category:

- `logic`
- `integration`
- `state-management`
- `error-handling`
- `cleanup`
- `compatibility`
- `concurrency`
- `security`
- `data-schema`
- `api-contract`
- `test-gap`
- `edge-case`

Give findings stable report-local IDs `RP-01`, `RP-02`, ... . Return raw verdict `incorrect` when any P0–P2 finding exists. P3 alone is non-blocking, so return `correct` while listing it as advisory.

## Full raw report

For every finding provide:

- ID
- priority
- category
- concise title
- trigger
- impact
- remedy
- affected file with a patch-overlapping line range

End with overall verdict `correct` or `incorrect`, a 1–3 sentence explanation, and confidence from 0.0 to 1.0. If no finding meets threshold, say so explicitly.

## Return

Return the complete report directly to the outer control plane. Do not create review artifacts, manifests, execution state, adjudication files, or retry state. Include every P0–P3 finding with its trigger, evidence, impact, and remedy so the caller can route the review without reconstructing omitted evidence.
