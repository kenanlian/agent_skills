---
name: review-patch
description: Review a code patch for introduced correctness, integration, security, and test defects. In persisted review cycles, write the full raw review directly to the caller-provided audit artifact and return only a compact control result.
---

# Review patch

Identify patch-introduced bugs that are reachable and have concrete user or system impact. Review the patch first, then read sufficient surrounding code to prove each finding.

## Inputs and authority

The caller supplies the implementation scope as a workspace, diff, or commit range plus the intended behavior. Optional persisted-cycle inputs are:

- `Execution ID`
- `Review Round` from 1 through 3
- `Review Scope`: `workspace | commit-range | workspace-and-commits`
- `Reviewed Head`
- `Diff Base`
- `Diff Head`
- `Raw Review Artifact`: exact path for the immutable full report

If `Review Round` is above 3, stop without reviewing and report that the cycle requires user direction. If omitted, perform one standalone review and never initiate a rerun yourself.

Remain source-read-only: do not edit implementation files, tests, configuration, plans, or any other workspace file; do not run builds/tests or state-changing commands. When `Raw Review Artifact` is provided, you have exclusive write authority only for that one new audit file. Do not update manifests, execution state, adjudication, or any other audit artifact. The caller owns persistence outside this raw report, adjudication, fixes, and reruns.

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

## Persisted-cycle output protocol

When `Raw Review Artifact` is supplied:

1. Complete the review.
2. Write the entire raw report directly to that exact path before returning. The artifact becomes immutable after return.
3. Include provenance frontmatter:

```markdown
---
execution_id: <provided execution id>
round: <N>
reviewer: review-patch
reviewed_head: <sha>
review_scope: <workspace | commit-range | workspace-and-commits>
diff_base: <sha/ref or null>
diff_head: <sha/ref or WORKTREE>
reviewer_skill_sha256: <digest or unknown>
reviewer_model: <host-reported identifier or unknown>
reviewer_reasoning: <host-reported value or unknown>
started: <timestamp>
completed: <timestamp>
verdict: <correct | incorrect>
confidence: <0.0-1.0>
---

# Raw patch review

<complete raw report>
```

Do not return the full report after it has been persisted. Return only:

```text
Outcome: review completed
Verdict: <correct | incorrect>
Confidence: <0.0-1.0>
Artifact: <Raw Review Artifact>
Findings:
- RP-01 | <P0-P3> | <category> | <one-line summary>
- ...
Evidence limitations: <one-line summary or None>
```

The compact finding index must include every P0–P3 finding. Keep summaries to one line; trigger, evidence, impact, and remedy remain in the artifact for on-demand parent reads.

If the raw artifact write fails, report the persistence failure and do not claim the round completed. Do not send the full report merely so the caller can persist it for you.

When `Raw Review Artifact` is not supplied, behave as a standalone advisory reviewer and return the full report normally; do not create audit files.
