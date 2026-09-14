---
name: review-plan
description: Review a saved implementation plan for requirement coverage, source grounding, decision completeness, work-package DAG safety, and verifiable acceptance criteria.
---

# Review plan

Determine whether the saved plan carries a fresh implementer from current repository state to a verified result without making a new load-bearing decision, reconciling contradictory instructions, or inventing a coordination boundary. Ordinary repository navigation and local implementation judgment are not plan defects when they cannot change observable behavior or a cross-package contract.

## Inputs and authority

`Plan File` is required. Read the complete file yourself; never review a summary or reconstruct a missing plan from conversation, code, or a diff.

Optional inputs:

- `Scope`: narrowed plan sections.
- `Custom Instructions`: explicit additional constraints.
- outer-control-plane review identity needed for evidence attribution: board, Card id,
  feature id, current review run id, round, exact Plan path, and Plan SHA-256.

If the plan is missing or unreadable, stop and report the exact missing input.

Remain source-read-only: do not edit the plan, product code, tests, configuration, or any other workspace file; do not run builds/tests or state-changing commands. Finish by calling `submit_plan_review` with the typed payload below; the tool validates and terminates, and the outer control plane persists, identity-binds, routes the verdict, adjudicates, revises the plan, and enforces retry limits.

This reviewing agent owns every severity and its review verdict. Explorers locate and trace evidence but never decide whether the plan passes.

## Build the coverage model

Extract the plan into four sets:

- `R*`: requested outcomes;
- `C*`: observable behavior, invariants, prohibitions, and shared interfaces;
- `WP-*`: bounded work packages and dependencies;
- `V*`: focused, integration, and end-to-end verification.

Build an `R → C → WP → V` coverage matrix. A missing edge is blocking when it leaves an outcome unimplemented, an unauthorized package unexplained, or material behavior unverifiable.

## Apply the materiality gate

Report a P0–P2 defect only when leaving it unresolved would create at least one of these conditions:

- the executor must choose among reasonable options that change observable behavior, a public interface, data, security, compatibility, failure semantics, rollout, or a cross-package boundary;
- two plan instructions cannot be satisfied together;
- a work package cannot complete within its dependencies, authority, ownership, or verification conditions;
- a requested outcome has no implementation path or credible proof path;
- an omitted producer, consumer, state transition, or failure route makes a wrong implementation likely; or
- execution could cause significant user, security, data, compatibility, reliability, or irreversible harm.

Wrong line numbers, local imports, helper placement, exact test counts, non-load-bearing wording, and ordinary source lookup are not findings unless the error changes what must be built, who owns it, ordering, or whether a material contract can be verified. P3 is only for a real reachable low-impact correctness risk, not style or preferred design.

## Review in two passes

### 1. Internal executability

Check scope, terminology, contracts, assumptions, settled decisions, executable entry points, ordering, dependencies, work-package bounds, unique canonical `WP-*` headings, focused verification, predecessor outputs, successor handoffs, parallel ownership, main-owned integration, and contingencies. Each `WP-*` must have exactly one heading containing that identifier so an executor can resolve the package from the plan file plus ID. A missing, duplicated, or body-only WP ID is a work-package-boundary defect. Flag package size or splitting only when it creates an unresolved decision, overlapping authority, unstable handoff, or unsafe schedule.

### 2. Repository and risk grounding

Verify repository claims that are load-bearing for behavior, interfaces, ownership, ordering, risk, or verification. Search aliases, string forms, registrations, serialization, configuration, and dynamic entry points before accepting an exhaustive or negative claim.

Apply relevant sweeps:

- **Interface closure:** producers, consumers, wire formats, clients, mocks, fixtures, docs, removals.
- **State and failure:** partial success, retry, repetition, concurrency, cancellation, timeout, cleanup, restart, empty/missing/conflict states, transactions.
- **Security:** authentication, authorization, tenant isolation, validation, secrets, logs, bypasses.
- **Data and rollout:** migrations, backfill, mixed versions, deployment order, defaults, flags, observability, rollback, irreversible operations.
- **Verification quality:** concrete oracle, prerequisites, negative behavior, tests that would fail for a plausible defect.
- **Freshness:** plan baseline and task-relevant workspace state; classify material drift rather than silently approving stale instructions.

## Delegate evidence collection

After identifying independent evidence questions, follow `delegate-work` with bounded read-only explorers. Partition by one interface trace, risk sweep, verification path, or ownership check. Confirm every blocking finding, every “no other route exists” claim, and every delegated negative result yourself.

## Severity, category, and verdict

Use:

- `P0`: release-blocking, severe security/data, or broadly irreversible harm.
- `P1`: missing or false load-bearing decision, interface, dependency, baseline, or proof path that makes execution unsafe or likely wrong.
- `P2`: reachable material edge case, integration path, work-package boundary, or proof gap.
- `P3`: reachable low-impact correctness risk that does not block safe execution.

Assign exactly one category:

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

Give findings stable report-local IDs `PR-01`, `PR-02`, ... . Submit raw verdict `REVISE` when any P0–P2 gap prevents decision-complete execution or credible proof; otherwise submit `APPROVE`. P3 alone does not block approval.

## Full raw report

The complete report contains:

1. `APPROVE` or `REVISE`, 1–3 sentence summary, confidence 0.0–1.0.
2. **Coverage matrix:** one compact row per material `R*`/`C*`, naming `WP-*`, `V*`, and `covered`/`missing`.
3. **Required revisions:** every P0–P2 finding, earliest dependency failure first, with `PR-*`, severity, category, missing/false contract, repository evidence, impact, exact decision/information needed, and concrete suggestion.
4. **Non-blocking risks:** at most two useful P3 findings.
5. **Evidence checked:** source anchors, exhaustive searches, verification criteria, baseline result, and delegated evidence used.

If material coverage is incomplete because required evidence is unavailable, submit `REVISE` and identify the uncovered area. Missing non-load-bearing detail does not force revision.

## Finish

Finish by calling `submit_plan_review` with the typed payload. The tool validates, terminates,
and the caller persists and identity-binds the captured `structuredOutput`. Do not create
review artifacts, manifests, snapshots, adjudication files, or retry state.

```yaml
schema: development-plan-review.v1
board: <exact supplied slug or null>
card_id: <exact supplied id or null>
feature_id: <exact supplied id or null>
review_run_id: <exact supplied integer or null>
round: <exact supplied integer or null>
plan:
  path: <exact absolute path>
  sha256: <verified digest>
verdict: pass | revise
summary: <1-3 sentences>
confidence: <0.0-1.0>
coverage: []
required_revisions: []
non_blocking_risks: []
evidence_checked: []
delegated_evidence: []
evidence_limitations: []
```

Map native `APPROVE` to `verdict: pass` and `REVISE` to `verdict: revise`. Include every
P0–P3 finding and the full `R → C → WP → V` coverage in the corresponding arrays so the
outer control plane never reconstructs omitted evidence. Preserve every supplied identity
literally; do not infer or normalize it.
