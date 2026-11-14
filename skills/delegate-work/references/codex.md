# Codex adapter

## Spawn and routing

Use `spawn_agent` with `fork_turns: "none"` and the complete task contract. Select the model and reasoning effort from the semantic route:

| Route | Model | Reasoning effort | `timeout_ms` heartbeat |
| --- | --- | --- | --- |
| `explorer` | `gpt-6-luna` | `high` | `360000` (6 min) |
| `junior` worker | `gpt-6-luna` | `xhigh` | `360000` (6 min) |
| `senior` worker | `gpt-6.1-sol` | `medium` | `480000` (8 min) |
| `expert` worker | `gpt-6.1-sol` | `high` | `720000` (12 min) |

Keep explorers at `high` for broad repository tracing. A truly mechanical junior task may use `medium`; a junior task needing careful reasoning may use `high`.

## Waiting

Set `wait_agent.timeout_ms` to the route's heartbeat. A timeout does not terminate the child. If it is still progressing, repeat the wait with the same value, up to three waits total; then inspect status and apply the common stall policy.

## Correction and resume

Use `followup_task` with the existing subagent path or task name. `send_message` can communicate with a running child but does not start a new turn on an idle child.
