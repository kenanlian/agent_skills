# Codex adapter

Use this reference only when `delegate-work` is running under Codex. The common skill owns the task contract, semantic classification, boundedness, verification, and parent-control-plane rules; this file only translates the selected route into Codex-specific mechanics.

## Spawn and isolation

Always spawn with `fork_turns: "none"`. Put all necessary context in the task contract; never fork or otherwise pass the parent agent's conversation context.

Route `explorer` by its specialized role and route workers by capability tier:

| Route | Model | Reasoning effort | `timeout_ms` heartbeat |
| --- | --- | --- | --- |
| `explorer` | `gpt-5.6-luna` | `high` | `360000` (6 min) |
| `junior` worker | `gpt-5.6-luna` | `medium` or `high` | `360000` (6 min) |
| `senior` worker | `gpt-5.6-terra` | `high` | `480000` (8 min) |
| `expert` worker | `gpt-5.6-sol` | `high` | `720000` (12 min) |
| `reviewer` | `gpt-5.6-sol` | `high` | `720000` (12 min) |

The explorer always uses `high`: its work may require broad or exhaustive repository tracing even though it does not own engineering judgment. Use `medium` only for a truly mechanical `junior` worker task and `high` when even a small worker task needs careful reasoning. Do not lower a `senior` or `expert` route merely because the work is read-only.

## Waiting and stall handling

Every `wait_agent` must set the selected route's `timeout_ms`; do not omit it or substitute another value. The timeout is a heartbeat, not a kill.

If it fires while the subagent is still progressing, wait again with the same value, at most three waits total, then apply the common stall policy in `delegate-work`.

## Correction and resume

When verification finds an error or the response violates the task contract, resume the same subagent. Call `followup_task` with the existing subagent path or task name. Do not use `send_message`, because it does not start a new turn.

Do not silently create a replacement subagent when the original context can be resumed. If the original subagent is no longer resumable, report that limitation under the common blocker policy.
