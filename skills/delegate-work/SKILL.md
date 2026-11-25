---
name: delegate-work
description: Delegate when parallel work or a fresh context pays off.
---

# Delegate work

Work in the parent by default. Delegate a bounded assignment only when the handoff buys something: an independent workstream can run in parallel, a long investigation can return compact evidence, or a decision benefits from a second opinion. A quick lookup, a tight edit–check loop, or a batch of tool calls usually costs less to do directly.

## Choose the child

- **`explorer`** gathers repository facts, read-only and without a tier. Use it to find callers or trace data flow, not to diagnose a cause or give a review verdict.
- **`worker`** implements changes or exercises judgment. Use `senior` by default; choose `junior` when the approach is settled and low-risk, or `expert` when the reasoning is ambiguous, architecture-sensitive, or costly to get wrong. Read-only work can still need an expert.

Read only the active host adapter: [Codex](references/codex.md), [Cursor](references/cursor.md), [OpenCode](references/opencode.md), or [Pi](references/pi.md). Role, tier, and access guide the tool invocation; they need not be repeated as fields in the prompt. On other hosts, use native delegation only if isolation and access boundaries can be preserved; otherwise do the work in the parent or report the limitation.

## Give the child a brief

State the **goal, scope, and acceptance check** in plain language. For example: “In `src/`, trace callers of `saveDraft` without editing files. Return the paths and symbols; if you find no callers, say where and how you searched.” No work-type label or fixed report template is needed.

Point to the workspace, files, symbols, or domain skill the child needs; do not forward the parent conversation. The child reads those sources and flags missing inputs or conflicts before making affected changes.

Grant write access only for named files or directories, including tests or a requested report. Otherwise return findings directly. The parent settles shared interfaces before dispatch. Parallel assignments need stable inputs and non-overlapping writes; release dependent work only after verifying its input.

## Verify before accepting

The child returns the result, its evidence, and anything unresolved. For research, identify sources, relevant versions, and limits. For implementation, the same worker owns the relevant tests and reports what changed and which checks passed. Flag any need to write outside the assigned scope rather than expanding it.

The parent inspects the evidence or diff, runs focused checks, and owns integration and the final answer. Independently verify consequential claims, especially about interfaces, data boundaries, or missing behavior. If a check fails, resume the same child with the failed expectation and evidence. Follow the host's waiting rules; if the child stalls or cannot resume, report the limitation and finish in the parent when safe.
