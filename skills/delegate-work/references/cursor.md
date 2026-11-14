# Cursor adapter

## Subagent and routing

Use the built-in `generalPurpose` subagent with the complete task contract in its isolated context.

| Route | Model |
| --- | --- |
| `explorer` | `grok-4.7-high` |
| `junior` worker | `grok-4.7-high` |
| `senior` worker | `grok-4.7-high` |
| `expert` worker | `claude-opus-5-5-high` |

Multiple worker tiers may map to the same model; keep the semantic tier in the contract. If a mapped model is unavailable, retain the route and disclose the host-selected fallback.

## Correction and resume

Call `Task` with `resume` set to the existing `generalPurpose` subagent ID and supply the correction as the new prompt.
