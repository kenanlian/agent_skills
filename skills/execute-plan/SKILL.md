---
name: execute-plan
description: Execute an existing implementation plan from its saved plan file, step by step, with task tracking, codebase exploration, implementation, and verification through completion. Use after write-plan has produced a plan and the user asks a coding agent to implement, execute, carry out, or continue that plan.
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

For independent codebase exploration, follow the `delegate-work` skill and dispatch the current platform's built-in read-only subagent.

- Split exploration into distinct, bounded questions such as current implementation and call paths, related tests, and repository conventions.
- Give every subagent the required skill, a clear task and goal, included and excluded scope, relevant inputs, and explicit return requirements.
- Launch independent exploration tasks concurrently. Keep dependent questions serial.
- Request exact paths, symbols, and evidence, then verify relevant findings against the repository before relying on them for edits.
- Do not delegate coordination or responsibility for following the plan; the main agent owns sequencing, todos, integration, and final verification.
- If built-in subagent delegation is unavailable, explore directly and keep executing the plan.

## Parallel implementation

For implementation delegation, follow the `delegate-work` skill and dispatch the current platform's built-in write-capable subagent. Run several subagents concurrently only when the plan contains independent, bounded tasks that can be implemented and locally verified without waiting for one another.

- Identify dependencies before delegating implementation. Run independent tasks concurrently and keep dependent tasks serial.
- Give each subagent the required domain skill, concrete task and goal, repository, included and excluded scope, relevant inputs, constraints, allowed files or modules, focused validation commands, and required return content.
- Avoid parallel delegation when tasks have overlapping implementation surfaces, require unsettled shared interfaces, or need cross-task design decisions during implementation.
- Each subagent owns the implementation, related unit tests, and focused validation for its assigned task.
- Require each response to include completion status, files changed, behavior implemented, tests added or updated, validation commands and observed results, and remaining issues.
- Do not delegate plan coordination, cross-task integration, integration tests, or final verification. The main agent owns these responsibilities and remains accountable for overall correctness.
- Review and verify each result before relying on it in dependent work or integration.
- If implementation or unit tests are incomplete or incorrect, resume the same subagent with failure evidence and the missing return requirements rather than replacing it.
- After parallel tasks complete, the main agent integrates their results, resolves cross-task issues, runs integration tests, and performs the plan's final verification.

## Execution discipline

- Inspect the current working tree before editing and preserve unrelated user changes.
- Use the plan's prescribed validation at the point it specifies. For an unspecified per-step check, choose a focused test, typecheck, build check, or direct behavioral observation appropriate to the change.
- If a verification fails, diagnose and fix the failure within the plan's scope, then rerun the failed check before continuing.
- If repository reality contradicts a load-bearing plan assumption and the plan provides a contingency, execute that contingency. If it provides none and choosing a direction would materially change scope or behavior, report the evidence and ask the user rather than silently replanning.
- At completion, report the implemented outcome, the verification performed and its result, and any residual risks or blockers. Do not claim completion while any plan item remains unverified.
