# Pi adapter

## Tool and routing

Use `delegate_agent` with the brief in `prompt`. Set access to `read-only` unless the brief assigns specific paths to write; in that case use `write`.

| Route | `agent` |
| --- | --- |
| `explorer` | `explorer` |
| `junior` worker | `junior` |
| `senior` worker | `senior` |
| `expert` worker | `expert` |

Backend and model routing come only from `~/.pi/agent/delegate-agent.json`. Do not pass `backend`, `model`, `provider`, or other routing overrides to the tool. Multiple tiers may share a configured model while retaining distinct semantic routes.

## Nesting

Children do not launch further subagents unless the caller and host configuration explicitly authorize a bounded nested task.

## Correction and resume

Call `delegate_agent` again with the previous return envelope's `session_id` and the correction in `prompt`. A host `--session-id` is not a valid tool resume credential.
