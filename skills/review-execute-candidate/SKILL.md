---
name: review-execute-candidate
description: Review one frozen execute candidate through independent patch-correctness and accepted-plan-conformance gates.
disable-model-invocation: true
---

# Review execute candidate

Review one frozen implementation candidate in a single fresh, source-read-only session. Preserve two independent logical gates:

1. **Patch Gate** — introduced correctness, integration, security, compatibility, state, error-path, and test defects.
2. **Plan Conformance Gate** — complete coverage of the accepted Plan's material behavioral contracts.

Do not collapse either gate into a generic impression. This Skill returns evidence to the outer control plane; it does not edit, run project checks, drive UI, persist workspace artifacts, route lifecycle, or initiate another review.

## Required inputs

Fail closed if any required identity is missing, unreadable, ambiguous, or internally inconsistent:

- repository root;
- board, Card id, feature id, current review run id, and review round;
- candidate commit, diff base, and diff head (`diff_head` must equal candidate);
- absolute accepted Plan path and exact SHA-256;
- intended behavior/Card contract and implementation handoff;
- terminal implementation Relay/session identity;
- candidate manifest path and content hash;
- when UI/manual acceptance is required, the existing evidence path(s) and content hash(es).

Read and hash the exact Plan before judging. Resolve both commits and inspect only the frozen `diff_base..diff_head` plus enough surrounding current code and tests to prove findings. Do not silently review a dirty working tree, current HEAD when it differs, another candidate, or an inferred Plan.

## Read-only boundary

You and every delegated child are source/worktree read-only:

- do not edit or create workspace files, review artifacts, manifests, state, or plans;
- do not run builds/tests or any state-changing command;
- do not invoke write-access children;
- do not commit, push, open a PR, release, deploy, publish, or change versions;
- do not drive a browser/application or repeat UI acceptance.

Read-only Git inspection, source search, and hashing are allowed. Return the complete report in the final response; the adapter's run-scoped result directory is managed by the caller.

## Delegate-work discipline

Follow `delegate-work`. The top-level reviewer owns normalization, every gate status, priority, overall verdict, and the final report. Delegate only bounded read-only evidence questions with non-overlapping scope. Useful parallel explorers are:

- patch-flow tracer: changed public values/events/state/error paths and their consumers;
- plan-contract mapper: Plan contracts to implementation/tests/evidence;
- bypass/negative-path scout: forbidden effects, repeated/concurrent actions, migration/compatibility paths.

Explorers return evidence, not verdicts. Confirm every blocking finding, every `satisfied`/`satisfied-differently` claim that carries a load-bearing boundary, and every bypass-free claim yourself. A small candidate may be reviewed without delegation when splitting would not improve coverage.

## Patch Gate

Review the diff first, then sufficient surrounding code. Report a finding only when it is introduced/exposed by this candidate, realistically reachable, materially impacts user/data/security/reliability/integration/compatibility/performance, lies within the accepted behavior or established contract, has a discrete remedy, and does not depend on an unstated preference.

Check:

- changed public values, schemas, commands, messages, events, and consumers;
- state transitions, retries, concurrency/repetition, cleanup, and failure paths;
- authorization/trust boundaries, compatibility, data preservation, and migration;
- negative paths and bypass routes;
- tests that should fail for a concrete material regression.

Priorities:

- P0: release-blocking/universal severe impact;
- P1: high-impact defect requiring prompt correction;
- P2: reachable meaningful correctness/integration/reliability/compatibility/data defect;
- P3: concrete low-impact advisory that is safe to ship.

Assign stable IDs `RE-P01`, `RE-P02`, ... and one category: `logic`, `integration`, `state-management`, `error-handling`, `cleanup`, `compatibility`, `concurrency`, `security`, `data-schema`, `api-contract`, `test-gap`, or `edge-case`.

For each finding give priority, category, title, trigger, evidence with patch-overlapping file/line, impact, and bounded remedy. Any P0–P2 means Patch Gate `fail`; no P0–P2 means `pass` while retaining P3 advisories.

## Plan Conformance Gate

Normalize the complete accepted Plan into material behavioral contracts in Plan order:

- observable behavior and failure semantics;
- safety/data/security/compatibility/migration properties;
- public interfaces and responsibility boundaries;
- explicit prohibitions;
- tests/evidence required to establish material behavior.

Rationale, bookkeeping, source anchors, exact test counts, and internal implementation suggestions are not contracts unless public compatibility or a responsibility boundary depends on them. Preserve Plan contract IDs; otherwise assign `RE-C01`, `RE-C02`, ... .

For every contract record Plan section, dependencies, status, and concise behavioral evidence:

- `satisfied`;
- `satisfied-differently`;
- `violated` with one type: `missing-implementation`, `partial-implementation`, `forbidden-path-remains`, `missing-negative-path`, `missing-regression-test`, `behavioral-mismatch`, `responsibility-boundary`, or `compatibility-migration`;
- `unverifiable` only when runtime/hardware/external/manual evidence is genuinely required and unavailable.

Inspect all routes that could produce a prohibited effect. A symbol or test name is not behavioral proof. List out-of-Plan changes without using this gate to judge patch correctness. Any material `violated` contract means Plan Conformance Gate `fail`; otherwise it is `pass` only when material coverage is assessable. A genuinely unavailable material proof is an evidence blocker, not an invented PASS.

## Existing UI/manual evidence

Do not perform UI acceptance. Parse and validate the caller-provided evidence against the frozen identity:

- board/Card/feature/stage;
- producing Implement run and attempt;
- candidate commit and diff base/head;
- accepted Plan path/SHA;
- terminal Relay/session;
- artifact content hashes;
- valid named UI lease interval and cleanup;
- all required automated scenarios PASS;
- all required candidate-bound manual verdicts PASS.

A missing/mismatched/stale evidence packet that implementation can regenerate is a revise reason. A genuine external/manual prerequisite may make overall `blocked`. UI evidence never changes a failed Patch or Conformance Gate into PASS.

## Verdict

Derive mechanically:

- either logical gate `fail` → `overall: revise`;
- both gates `pass` plus UI/manual `pass|not-required` → `overall: pass`;
- both gates `pass` but correctable evidence is missing/mismatched → `overall: revise`;
- only a genuine unavailable human/external prerequisite → `overall: blocked`.

Do not use `blocked` for ordinary implementation defects, missing tests, or regenerable evidence.

## Return contract

Return exactly one YAML document without a Markdown fence, using this top-level shape (the example is fenced only for this Skill document):

```yaml
schema: development-execute-review.v1
board: <slug>
card_id: <id>
feature_id: <id>
review_run_id: <id>
round: <n>
candidate_commit: <sha>
diff_base: <sha>
diff_head: <sha>
accepted_plan:
  path: <absolute path>
  sha256: <sha>
implementation_relay:
  session_id: <id>
candidate_manifest:
  path: <path>
  sha256: <sha>
patch_gate:
  verdict: pass | fail
  findings: []
  advisories: []
plan_conformance_gate:
  verdict: pass | fail
  coverage: []
  findings: []
  accepted_deviations: []
  out_of_plan_changes: []
ui_evidence:
  verdict: pass | not-required | revise | blocked
  paths: []
  findings: []
overall:
  verdict: pass | revise | blocked
  summary: <1-3 sentences>
  confidence: <0.0-1.0>
delegated_evidence: []
evidence_limitations: []
```

`findings` must contain full evidence, not only titles. Preserve the complete Plan contract coverage table, every Patch P0–P3, accepted deviations, out-of-Plan changes, UI evidence findings, delegated evidence used, and limitations. Do not create a separate artifact or retry state; return this report to the outer Review Worker for identity validation and managed verdict routing.
