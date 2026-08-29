---
name: review-patch
description: Review a code patch for introduced correctness, integration, security, and test defects. Use after implementation and before merge; remain advisory and do not edit files or run state-changing commands.
---

# Review patch

Identify patch-introduced bugs that are reachable and have concrete user or system impact. Review the patch first, then read sufficient surrounding code to prove each finding.

## Scope

Review the implementation that changed, not the proposal that preceded it. Do not redesign an approved plan, report unrelated technical debt, or request features outside the stated change unless the patch breaks an existing or stated contract.

The caller should provide `Review Round` from 1 through 3 when this invocation belongs to a persisted cycle. If it provides a value above 3, stop without reviewing and report that the cycle requires user direction. If omitted, perform one review and never initiate a rerun yourself.

## Procedure

1. Inspect the relevant diff, determine the intended behavioral change, and read every changed hunk in context.
2. Trace changed public values, events, commands, messages, frames, schemas, and enum variants to their consumers. Verify they are handled rather than silently dropped.
3. Check changed error paths, state transitions, cleanup, authorization boundaries, compatibility behavior, and concurrent or repeated execution when applicable.
4. Inspect the relevant tests. Report a test gap only when a concrete, material defect in the changed behavior could plausibly pass the existing checks.
5. When focused read-only tracing would materially improve coverage, follow the `delegate-work` skill and give each built-in read-only subagent a bounded question, explicit scope, and evidence return contract.
6. Do not edit files, run builds or tests, persist review artifacts, or trigger other state-changing commands. The caller owns review persistence and adjudication.

## Finding criteria

Report a P0–P2 issue only if all of these hold:

- the patch introduced or exposed it;
- a supported input, normal operation, credible failure, or realistic concurrent/repeated action can trigger it;
- it has concrete user, data, security, compatibility, reliability, integration, or material performance impact;
- the affected behavior is within the patch's contract or established system behavior;
- it has a discrete remedy within the patch's reasonable scope; and
- it does not rely on an unstated product preference.

P3 may be used only for a patch-introduced, reachable, concrete but low-impact correctness concern that is useful as an advisory. Do not report style, maintainability alone, exact source locations, unreachable adversarial language constructs, pre-existing technical debt, theoretical risk without a credible route, or a design that is merely preferable. A locally unusual pattern is not a defect when supported inputs cannot reach the claimed failure.

Use P0–P3 severity:

- P0: release-blocking or universal severe impact
- P1: high-impact defect needing prompt correction
- P2: reachable defect with meaningful user-visible, integration, reliability, compatibility, or bounded data impact
- P3: reachable but low-impact correctness concern that is safe to ship as an advisory

Assign exactly one category to each finding from this stable taxonomy:

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

Choose the category that best describes the defect's primary failure mode rather than every affected subsystem.

## Output

Give findings stable IDs in report order: `RP-01`, `RP-02`, and so on. For each finding, provide:

- ID
- priority
- category
- concise title
- trigger
- impact
- remedy
- affected file with a patch-overlapping line range

End with an overall verdict (`correct` or `incorrect`), a 1–3 sentence explanation, and confidence from 0.0 to 1.0. Return `incorrect` when any P0–P2 finding exists. P3 alone is non-blocking, so return `correct` while listing it as an advisory. If no findings meet the threshold, say so explicitly. Do not omit IDs or categories when findings exist; callers may persist and aggregate these fields across review runs.
