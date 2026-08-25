---
name: review-patch
description: Review a code patch for introduced correctness, integration, security, and test defects. Use after implementation and before merge; remain advisory and do not edit files or run state-changing commands.
---

# Review patch

Identify bugs the author would want fixed before merge. Review the patch first, then read sufficient surrounding code to prove each finding.

## Scope

Review the implementation that changed, not the proposal that preceded it. Do not redesign an approved plan, report unrelated technical debt, or request features outside the stated change unless the patch breaks an existing or stated contract.

## Procedure

1. Inspect the relevant diff, determine the intended behavioral change, and read every changed hunk in context.
2. Trace changed public values, events, commands, messages, frames, schemas, and enum variants to their consumers. Verify they are handled rather than silently dropped.
3. Check changed error paths, state transitions, cleanup, authorization boundaries, compatibility behavior, and concurrent or repeated execution when applicable.
4. Inspect the relevant tests. Determine whether they cover the changed observable contract and would fail for a plausible defect in the patch.
5. When focused read-only tracing would materially improve coverage, follow the `delegate-work` skill and give each built-in read-only subagent a bounded question, explicit scope, and evidence return contract.
6. Do not edit files, run builds or tests, persist review artifacts, or trigger other state-changing commands. The caller owns review persistence and adjudication.

## Finding criteria

Report an issue only if it is introduced by the patch, has provable impact, has a concrete trigger, has a discrete remedy, and does not rely on unstated assumptions. Ignore style-only nits, speculative concerns, pre-existing defects, and alternatives that are merely preferable.

Use P0–P3 severity:

- P0: release-blocking or universal severe impact
- P1: high-impact defect needing prompt correction
- P2: meaningful edge case or integration defect
- P3: minor but actionable correctness concern

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

End with an overall verdict (`correct` or `incorrect`), a 1–3 sentence explanation, and confidence from 0.0 to 1.0. If no findings meet the threshold, say so explicitly. Do not omit IDs or categories when findings exist; callers may persist and aggregate these fields across review runs.
