---
name: execute-plan
description: Execute an existing implementation plan from its saved plan file, step by step, with todo tracking, codebase exploration, implementation, and verification through completion. Use after write-plan has produced a plan and the user asks Codex to implement, execute, carry out, or continue that plan.
---

# Execute plan

<critical>
Before doing any implementation work or codebase exploration, read the exact plan file provided for this task.

- Treat the plan file as the authoritative execution specification. Visible, summarized, or compressed conversation context is secondary.
- If the plan file path is unknown, stop immediately. Tell the user that the path is required and wait for their reply. Do not guess the path, search for a likely plan, or execute from inline context.
- If reading the plan fails, stop immediately. Report the exact path and the exact read error, then wait for the user. Do not infer or reconstruct the plan.
- Never stop merely because inline plan content is compressed, expired, incomplete, or unrecoverable. Read the plan file.
- Continue until every plan step and final verification is complete, unless a genuine blocker requires information or authority only the user can provide.
</critical>

## Workflow

1. Read the complete plan file before taking task actions. Re-read any referenced section when exact wording matters.
2. Translate the plan's ordered steps and verification work into todo tracking when a todo tool is available. Preserve dependencies and keep exactly one actionable item in progress unless independent work is running concurrently.
3. Execute the plan step by step with the tools available in the session. Follow the plan's stated targets, interfaces, constraints, and fallbacks; do not silently redesign it from conversation memory.
4. Verify each step with the checks specified by the plan, plus the smallest relevant objective check needed to establish that the step succeeded. Do not proceed to a dependent step until verification passes.
5. Run the plan's final verification and confirm the requested observable behavior before reporting completion.

## Todo tracking

After reading the plan, initialize todo tracking immediately when a todo tool is available.

- Create bounded items that map to the plan's steps, including a final verification item.
- Immediately mark an item complete after its verification passes, before starting the next dependent item.
- Add discovered corrective work to the tracker instead of completing an item prematurely.
- If a todo call fails, correct its payload and retry successfully before continuing execution.

If no todo tool is available, maintain the same step order internally and continue; absence of that tool is not a reason to stop.

## Codebase exploration and delegation

Prefer parallel delegation to `explorer-agent` for codebase exploration when subagents are available and the questions are independent.

- Split exploration into distinct, bounded questions such as current implementation and call paths, related tests, and repository conventions.
- Launch independent exploration tasks concurrently. Keep dependent questions serial.
- Make explorer tasks read-only and request exact paths, symbols, and evidence.
- Verify relevant explorer findings against the repository before relying on them for edits.
- Do not delegate coordination or the responsibility to follow the plan; the main agent owns sequencing, todos, integration, and final verification.
- If `explorer-agent` or delegation is unavailable, explore directly and keep executing the plan.

## Parallel implementation

Use `task-agent` for implementation delegation. Run multiple `task-agent` subagents concurrently only when the plan contains independent, bounded tasks that can be implemented and locally verified without waiting for one another.

- Identify dependencies before delegating implementation. Run independent tasks concurrently and keep dependent tasks serial.
- Give each `task-agent` an explicit scope, expected behavior, constraints, allowed files or modules, and focused validation commands.
- Avoid parallel delegation when tasks have overlapping implementation surfaces, require unsettled shared interfaces, or need cross-task design decisions during implementation.
- Each `task-agent` owns the implementation, its related unit tests, and focused validation for its assigned task.
- Require each subagent to report the files changed, the behavior implemented, the unit tests added or updated, and the validation results.
- Do not delegate plan coordination, cross-task integration, integration tests, or final verification. The main agent owns these responsibilities and remains accountable for overall correctness.
- Review and verify each subagent's result before relying on it in dependent work or integration.
- If a `task-agent`'s implementation or unit tests are incomplete or incorrect, resume that same `task-agent` with the failure evidence and required correction. Do not start a new subagent to replace it.
- After the parallel tasks complete, the main agent integrates their results, resolves cross-task issues, runs integration tests, and performs the plan's final verification.

## Execution discipline

- Inspect the current working tree before editing and preserve unrelated user changes.
- Use the plan's prescribed validation at the point it specifies. For an unspecified per-step check, choose a focused test, typecheck, build check, or direct behavioral observation appropriate to the change.
- If a verification fails, diagnose and fix the failure within the plan's scope, then rerun the failed check before continuing.
- If repository reality contradicts a load-bearing plan assumption and the plan provides a contingency, execute that contingency. If it provides none and choosing a direction would materially change scope or behavior, report the evidence and ask the user rather than silently replanning.
- At completion, report the implemented outcome, the verification performed and its result, and any residual risks or blockers. Do not claim completion while any plan item remains unverified.
