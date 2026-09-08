# Pi adapter

Use this reference only when `delegate-work` is running under Pi. The common skill owns the task contract, semantic classification, boundedness, verification, and parent-control-plane rules; this file only translates the selected route into Pi-specific mechanics.

## Tool and isolation

Always use the host tool `delegate_agent`. Put the complete task contract in `prompt`; never rely on or attempt to pass the parent conversation. The task contract contains either necessary inline context or exact pointers sufficient for the child to resolve that context. Do not pass `backend`, `model`, `provider`, or any other routing field into the tool.

Route `explorer` by its specialized role and route workers by capability tier. Each semantic route maps to the same-named `agent` argument:

| Route | `agent` |
| --- | --- |
| `explorer` | `explorer` |
| `junior` worker | `junior` |
| `senior` worker | `senior` |
| `expert` worker | `expert` |

Backend and model are not caller choices. They come only from `~/.pi/agent/delegate-agent.json`. Plans, task DAGs, and this adapter must not name a concrete model.

The explorer route is a deliberate role-based exception to worker tier routing. It is optimized for high-coverage repository evidence gathering and remains read-only through the common task contract.

It is valid for multiple worker tiers to share a configured backend or model. The semantic tier remains stable even when the user's routing file changes. Change that configuration rather than callers when the preferred mapping changes.

For an unclassified or unsupported Pi task, use the configured route only after assigning the semantic route; do not collapse exploration and worker reasoning into one work-type-based rule.

## Access

The tool accepts `read-only` and `write`; pass the value selected by the common task contract.

## Nesting

The calling parent may launch explorers or workers. Delegated children do not launch further subagents unless a separate caller skill and host configuration explicitly grant a narrower nested contract.

## Correction and resume

When verification finds an error or the response violates the task contract, call `delegate_agent` again with `session_id` set to the `session_id` from the previous return envelope. Supply the correction as the new `prompt`; do not omit `session_id` or start a new child. Never use a host `--session-id` as the tool's resume credential.

If the original child is no longer resumable, report that limitation under the common blocker policy rather than silently replacing it.
