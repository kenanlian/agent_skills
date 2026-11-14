---
name: delegate-work
description: Delegate bounded exploration, implementation, design, analysis, or research to an isolated subagent. Use for independently verifiable work that benefits from a separate context or parallel execution.
---

# Delegate work

The parent owns task decomposition, shared decisions, integration, verification, and the final answer. Subagents own bounded assignments; delegation can be serial or parallel.

## Choose a bounded assignment

Delegate work with a concrete goal, sufficient inputs, explicit scope, and a verification method. Resolve shared interface decisions before dispatch. Split assignments that mix unrelated goals.

For write tasks, assign explicit file or directory ownership. Run tasks concurrently only when their writes do not overlap and their inputs are stable. A task that depends on another task's output waits until that output is verified.

## Select the route

| Role | Use | Capability tier | Access |
| --- | --- | --- | --- |
| `explorer` | Repository evidence: locate, trace, map, enumerate, and cross-check facts | `None` | `read-only` |
| `worker` | Implementation, research, design, planning, or analysis requiring judgment | `junior`, `senior`, or `expert` | `read-only` or `write` |

Explorers may search broadly but do not own root-cause diagnosis, design choices, correctness judgments, or review verdicts. Use a worker when the assignment requires those judgments; the parent retains final acceptance.

Worker tiers describe reasoning needs:

- `junior`: straightforward, low-risk work with settled interfaces.
- `senior`: default for normal engineering work with moderate context or cross-file reasoning.
- `expert`: complex, ambiguous, architecture-sensitive, or high-risk work.

Read-only access or a small file count does not imply a lower tier. Access follows the deliverable; write access remains limited to assigned ownership.

Set work type to `exploration` for explorers, or `research`, `implementation`, `design`, `planning`, or `analysis` for workers. Code/file changes are `implementation` even when the work starts with inspection.

## Load the host adapter

Read only the active host's reference for model/subagent routing, isolation, invocation, and continuation:

- [Codex](references/codex.md)
- [Cursor](references/cursor.md)
- [OpenCode](references/opencode.md)
- [Pi](references/pi.md)

For an unsupported host, use available native delegation tools while preserving isolation, task boundaries, and access constraints. If those cannot be maintained, perform the work in the parent or report the limitation.

## Provide the task contract

Give the child enough context to work independently. Use exact paths and relevant identifiers for existing artifacts; inline only instructions and facts that are not already available there. Do not pass the parent conversation, duplicated skill text, or raw discovery logs.

Use this compact structure, omitting optional sections that do not apply:

```markdown
## Route
Role: <explorer | worker>
Capability tier: <None | junior | senior | expert>
Access: <read-only | write>
Work type: <exploration | research | implementation | design | planning | analysis>

## Task
Goal: <observable result or exact question>
Repository/workspace: <path>
Scope: <included work and explicit exclusions>
Write ownership: <allowed paths or read-only>
Constraints: <interfaces to preserve and decisions reserved for the parent>

## Context
<relevant paths, symbols, dependency outputs, and essential task-local facts>

## Required skill (optional)
<available skill and reference paths to load before starting>

## Verification
<focused commands, expected behavior, or evidence standard>

## Return
<outcome, evidence or changed files, verification results, and remaining issues>
```

Name a domain skill only when it is available and relevant. The parent reads guidance needed to define the assignment; the child independently loads the named skill and references.

The child must read required context sources. If a required source is missing or ambiguous, report the blocker instead of inventing its contents. When instructions conflict with repository facts, surface the conflict before making affected changes. Necessary changes outside ownership also return to the parent for resolution.

## Collect and verify

Keep results compact: state whether the goal was achieved, what was found or changed, verification performed and its results, deviations, and blockers. Distinguish confirmed evidence from inference or unverified claims.

Include evidence appropriate to the work:

- **Exploration:** exact paths/symbols, relevant relationships, search coverage, and limitations. For negative claims, state which names or patterns were searched.
- **Research:** sources, applicable versions, and limitations; distinguish external findings from repository facts.
- **Implementation:** changed files, delivered behavior, and focused checks. The same worker owns implementation and relevant tests.
- **Design/planning/analysis:** recommendation or judgment, supporting evidence, and unresolved decisions.

Return results directly unless the assignment includes a report file. File output requires a write-enabled worker and the exact output path in its ownership; return a compact summary with the path and report any failed write. Avoid transcripts, private reasoning, and full console logs.

Before accepting results or releasing dependent work, inspect relevant edits and evidence and run appropriate checks. Independently verify consequential claims about interfaces, data/security boundaries, missing behavior, and integration.

If verification fails or the child violates the contract, resume the same child with the failed requirement, concrete evidence, and correction. Pass existing context by reference rather than repeating it. If that child cannot be resumed, disclose the limitation before choosing a fallback.

Follow host waiting rules and avoid indefinite waits. For stalled work, inspect status and either complete the assignment in the parent when safe or report the blocker. Disclose any optional investigation left incomplete.
