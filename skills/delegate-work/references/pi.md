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
| `reviewer` | `reviewer` |

Backend and model are not caller choices. They come only from `~/.pi/agent/delegate-agent.json`. Plans, task DAGs, and this adapter must not name a concrete model.

The explorer route is a deliberate role-based exception to worker tier routing. It is optimized for high-coverage repository evidence gathering and remains read-only through the common task contract.

It is valid for multiple worker tiers to share a configured backend or model. The semantic tier remains stable even when the user's routing file changes. Change that configuration rather than callers when the preferred mapping changes.

For an unclassified or unsupported Pi task, use the configured route only after assigning the semantic route; do not collapse exploration, worker reasoning, and review into one work-type-based rule.

## Access

The tool accepts only `read-only` and `write`.

Translate a persisted-review task-contract `audit-write` into `access: write` plus a prompt constraint that the child may create or overwrite only the exact artifact path named in write ownership. Never pass `audit-write` as a tool argument. Source, plan, tests, config, manifests, execution state, and every other path remain non-writable under that constraint.

A normal review with `Access: read-only` remains `read-only` at the tool. If the host cannot honor the translated write-plus-constraint for a persisted review, report a persistence blocker rather than broadening reviewer write authority or returning a large report solely for parent-side transcription.

## Nesting

The main agent may call all five tiers; only `reviewer` may nest, and only as `explorer` with `read-only`.

## Correction and resume

When verification finds an error or the response violates the task contract, call `delegate_agent` again with `session_id` set to the `session_id` from the previous return envelope. Supply the correction as the new `prompt`; do not omit `session_id` or start a new child. Never use a host `--session-id` as the tool's resume credential.

If the original child is no longer resumable, report that limitation under the common blocker policy rather than silently replacing it.
