# OpenCode adapter

Use this reference only when `delegate-work` is running under OpenCode. The common skill owns the task contract, semantic classification, boundedness, verification, and parent-control-plane rules; this file only translates the selected route into OpenCode-specific mechanics.

## Named subagents

OpenCode uses named custom subagents as the adapter. The agent names are stable capability roles; model selection belongs in each OpenCode agent definition rather than in the common skill.

| Route | OpenCode subagent |
| --- | --- |
| `junior` worker | `junior-worker` |
| `senior` worker | `senior-worker` |
| `expert` worker | `expert-worker` |
| `reviewer` | `reviewer` |

Expected definitions live in `platforms/opencode/agents/` in this repository and may be installed globally under `~/.config/opencode/agents/` or copied into a project's `.opencode/agents/` directory.

Configure each agent's `model` locally to match the available providers and plans. Do not encode Codex, Kimi, GLM, or other provider names into the cross-platform task contract.

## Permissions

The three worker agents may perform either read-only or write tasks according to the common task contract, but they must not launch nested subagents.

The `reviewer` must remain read-only and must not launch nested subagents.

The checked-in templates under `platforms/opencode/agents/` are the source of truth for these platform-level permission defaults. Task-specific write ownership and access still come from the common task contract.

## Correction and resume

When verification finds an error or the response violates the task contract, continue or resume the existing child session using the host's available continuation mechanism. Do not silently create a fresh replacement with lost context.

If the current OpenCode surface cannot resume the original child session, report that limitation under the common blocker policy rather than silently replacing it.
