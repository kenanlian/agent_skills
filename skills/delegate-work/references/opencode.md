# OpenCode adapter

Use this reference only when `delegate-work` is running under OpenCode. The common skill owns the task contract, semantic classification, boundedness, verification, and parent-control-plane rules; this file only translates the selected route into OpenCode-specific mechanics.

## Subagent routing

OpenCode uses its built-in `Explore` subagent for the specialized explorer role and named custom subagents for tiered workers and review.

| Route | OpenCode subagent |
| --- | --- |
| `explorer` | built-in `Explore` |
| `junior` worker | `junior-worker` |
| `senior` worker | `senior-worker` |
| `expert` worker | `expert-worker` |
| `reviewer` | `reviewer` |

The custom agent definitions live in `platforms/opencode/agents/` in this repository and may be installed globally under `~/.config/opencode/agents/` or copied into a project's `.opencode/agents/` directory. No custom explorer definition is required.

Do not bind a concrete model to the built-in `Explore` route in this repository; OpenCode owns that subagent's model routing. Configure each custom worker or reviewer agent's `model` locally to match the available providers and plans. Do not encode Codex, Kimi, GLM, or other provider names into the cross-platform task contract.

## Permissions

Use built-in `Explore` only for contracts classified as `explorer`; the common contract requires those tasks to remain read-only and evidence-only.

The three custom worker agents may perform either read-only or write tasks according to the common task contract, but they must not launch nested subagents.

The `reviewer` must remain read-only and must not launch nested subagents.

The checked-in templates under `platforms/opencode/agents/` are the source of truth for custom-agent permission defaults. Task-specific worker write ownership and access still come from the common task contract.

## Correction and resume

When verification finds an error or the response violates the task contract, continue or resume the existing child session using the host's available continuation mechanism. Do not silently create a fresh replacement with lost context.

If the current OpenCode surface cannot resume the original child session, report that limitation under the common blocker policy rather than silently replacing it.
