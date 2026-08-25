---
name: review-plan
description: Review a saved implementation plan for requirement coverage, source grounding, decision completeness, work-package DAG safety, and verifiable acceptance criteria. Use before execution after the user selects plan review; remain advisory and read-only.
---

# Review plan

Determine whether the saved plan alone carries a fresh implementer from current repository state to a verified result without rediscovering load-bearing facts, settling decisions, or inventing coordination boundaries.

## Inputs and authority

`Plan File` is required. Read the complete file yourself; never review a summary or reconstruct a missing plan from conversation, code, or a diff. Review against the current workspace unless the caller names another repository. `Scope` may narrow plan sections and `Custom Instructions` may add explicit constraints.

If the file is missing or unreadable, stop and ask for the exact path. Remain advisory: do not edit the plan or code, run tests or builds, persist review artifacts, or trigger state-changing commands. The caller owns review persistence and adjudication. Judge whether the selected design is executable; do not replace a workable design merely because another is preferable. Use `review-patch` for implementation defects.

The reviewing agent owns every severity and the final verdict. Scouts locate and trace evidence but never decide whether the plan passes.

## Build the coverage model

Extract the plan into four sets:

- `R*`: requested outcomes;
- `C*`: observable behavior, invariants, prohibitions, and shared interfaces;
- `WP-*`: bounded work packages and their dependencies; and
- `V*`: focused, integration, and end-to-end verification.

Build an `R → C → WP → V` coverage matrix. A missing edge is blocking when it leaves an outcome unimplemented, an unauthorized package unexplained, or behavior unverifiable.

## Review in two passes

### 1. Internal executability

Check the plan itself for:

- consistent scope, terminology, contracts, exact literals, and assumptions;
- settled product, architecture, interface, data, security, compatibility, and rollout decisions;
- executable entry points, correct ordering, explicit dependencies, and clear done conditions;
- bounded work-package goals, sufficient task-local context, and focused verification;
- stable predecessor outputs and explicit successor handoffs;
- non-overlapping ownership for parallel writes and no shared interface decided concurrently;
- explicit main ownership of cross-package decisions, integration, and final verification; and
- contingencies that prescribe an action instead of deferring a load-bearing choice.

Flag both under-splitting, where one package requires unrelated subsystems or excessive context, and over-splitting, where several packages must coordinate one closed behavior or test.

### 2. Repository and risk grounding

Verify every referenced pre-existing file, symbol, signature, interface, consumer, test, command, convention, dependency version, and baseline anchor against the current repository. Distinguish preconditions from artifacts created by earlier packages. Search aliases, string forms, registrations, serialization, configuration, and dynamic entry points before accepting an exhaustive or negative claim.

Apply the relevant risk sweeps:

- **Interface closure:** producers, consumers, wire formats, clients, mocks, fixtures, docs, and removals.
- **State and failure:** partial success, retry, repetition, concurrency, cancellation, timeout, cleanup, restart, empty/missing/conflict states, and transaction boundaries.
- **Security:** authentication, authorization, tenant isolation, input validation, secrets, logs, and bypass routes.
- **Data and rollout:** migrations, backfill, mixed versions, deployment order, defaults, feature flags, observability, rollback, and irreversible operations.
- **Verification quality:** a concrete oracle for new and negative behavior, commands with prerequisites, and tests that would fail for a plausible defect rather than merely build.
- **Freshness:** plan commit and task-relevant dirty state still match; classify changed anchors as material drift rather than silently approving stale instructions.

## Delegate evidence collection

After the coverage model identifies independent questions, follow `delegate-work` for bounded read-only scouts. Partition by one interface trace, risk sweep, verification path, or ownership check. Require exact evidence and search coverage; do not ask a scout to review the entire plan or issue the verdict.

Confirm every blocking finding, every “no other route exists” claim, and every delegated negative result yourself. Resume an unusable scout rather than replacing it.

## Severity, category, and verdict

Assign one severity to every finding:

- `P0`: execution can cause release-blocking, severe security/data, or broadly irreversible harm;
- `P1`: a missing or false load-bearing decision, interface, dependency, baseline, or verification path makes execution unsafe or likely wrong;
- `P2`: a meaningful edge case, integration path, work-package boundary, or acceptance criterion is incomplete;
- `P3`: actionable clarity or maintainability weakness that does not block safe execution.

Assign exactly one category to every finding from this stable taxonomy:

- `requirement-coverage`
- `source-grounding`
- `decision-completeness`
- `interface-closure`
- `work-package-boundary`
- `dag-safety`
- `verification-gap`
- `failure-behavior`
- `compatibility-rollout`
- `security-data`
- `baseline-drift`

Choose the category that best identifies the plan-quality failure that must be corrected, not every downstream area it could affect.

Give findings stable IDs in report order: `PR-01`, `PR-02`, and so on. IDs are report-local and need only remain stable within this review invocation; the caller may persist them for later adjudication.

Return `REVISE` when any `P0`–`P2` gap prevents decision-complete execution or proof of the promised behavior. Return `APPROVE` only when the full requested scope is covered and current repository evidence supports execution. `P3` alone is non-blocking.

## Output

Start with `APPROVE` or `REVISE`, a 1–3 sentence summary, and confidence from 0.0 to 1.0.

Then provide:

- **Coverage matrix:** one compact row per `R*`/`C*`, naming its `WP-*`, `V*`, and `covered` or `missing` status.
- **Required revisions:** omit when approving. Group by plan section or package, earliest dependency failure first. For each `P0`–`P2` finding, give its `PR-*` ID, severity, category, missing or false contract, repository evidence, execution or verification impact, exact decision/information needed, and a concrete `Suggestion:` that can be inserted into the existing design.
- **Non-blocking risks:** at most two `P3` findings. Give each its `PR-*` ID, category, concise evidence, impact, and suggestion.
- **Evidence checked:** source anchors, exhaustive searches, verification criteria, baseline result, and which items used scout evidence.

Do not hide incomplete review behind a partial approval. If any plan section or risk partition could not be reviewed, return `REVISE`, identify the uncovered area, and explain what evidence is missing.
