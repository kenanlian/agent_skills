# Cursor adapter

Use this reference only when `delegate-work` is running under Cursor. The common skill owns the task contract, semantic classification, boundedness, verification, and parent-control-plane rules; this file only translates the selected route into Cursor-specific mechanics.

## Subagent and isolation

Always use the built-in `generalPurpose` subagent. Rely on Cursor's isolated subagent context and provide the complete task contract; never rely on or attempt to pass the parent conversation. The task contract contains either necessary inline context or exact pointers sufficient for the child to resolve that context.

Route `explorer` by its specialized role and route workers by capability tier:

| Route | Model |
| --- | --- |
| `explorer` | `composer-2.5` |
| `junior` worker | `cursor-grok-4.6-high` |
| `senior` worker | `cursor-grok-4.6-high` |
| `expert` worker | `claude-opus-5-thinking-high` |
| `reviewer` | `gpt-5.6-sol-high` |

The explorer route is a deliberate role-based exception to worker tier routing. It is optimized for high-coverage repository evidence gathering and remains read-only through the common task contract.

It is valid for multiple worker tiers to map to the same current model. The semantic tier remains stable even when Cursor's available models or pricing change. Change this adapter rather than callers when the preferred mapping changes.

For an unclassified or unsupported Cursor task, use the host-selected model only after assigning the semantic route; do not collapse exploration, worker reasoning, and review into one work-type-based model rule.

## Correction and resume

When verification finds an error or the response violates the task contract, call the `Task` tool with its `resume` parameter set to the existing `generalPurpose` subagent ID. Supply the correction as the new prompt; do not omit `resume` or start a new subagent.

If the original subagent is no longer resumable, report that limitation under the common blocker policy rather than silently replacing it.
