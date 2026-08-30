# OpenCode adapter

Use this reference only when `delegate-work` is running under OpenCode. The common skill owns the task contract, semantic classification, boundedness, verification, and parent-control-plane rules; this file only translates the selected route into OpenCode-specific mechanics.

## Subagent routing

OpenCode uses its built-in `Explore` subagent for the specialized explorer role and named custom subagents for tiered workers and review.

| Route | OpenCode subagent | Model |
| --- | --- | --- |
| `explorer` | built-in `Explore` | `opencode-go/deepseek-v4-flash#high` |
| `junior` worker | `junior-worker` | `opencode-go/deepseek-v4-flash#high` |
| `senior` worker | `senior-worker` | `opencode-go/deepseek-v4-pro#high` |
| `expert` worker | `expert-worker` | `openai/gpt-5.6-sol#high` |
| `reviewer` | `reviewer` | `openai/gpt-5.6-sol#high` |

The custom agent definitions live in `platforms/opencode/agents/` in this repository and may be installed globally under `~/.config/opencode/agents/` or copied into a project's `.opencode/agents/` directory. Their checked-in frontmatter is the source of truth for worker and reviewer model selection.

No custom explorer definition is required. Override the built-in `Explore` model in OpenCode configuration:

```jsonc
{
  "agent": {
    "explore": {
      "model": "opencode-go/deepseek-v4-flash#high"
    }
  }
}
```

`opencode-go` requires an active OpenCode Go connection. The `openai/gpt-5.6-sol#high` routes assume OpenAI is connected through OpenCode's OpenAI provider, including ChatGPT Plus/Pro OAuth where available.

These concrete provider and model choices are platform-adapter details. Do not encode OpenCode Go, OpenAI, Codex, or model names into the cross-platform task contract, plans, or task DAGs.

## Permissions

Use built-in `Explore` only for contracts classified as `explorer`; the common contract requires those tasks to remain read-only and evidence-only.

The three custom worker agents may perform either read-only or write tasks according to the common task contract, but they must not launch nested subagents.

The `reviewer` must remain read-only and must not launch nested subagents.

The checked-in templates under `platforms/opencode/agents/` are the source of truth for custom-agent permission defaults. Task-specific worker write ownership and access still come from the common task contract.

## Correction and resume

When verification finds an error or the response violates the task contract, continue or resume the existing child session using the host's available continuation mechanism. Do not silently create a fresh replacement with lost context.

If the current OpenCode surface cannot resume the original child session, report that limitation under the common blocker policy rather than silently replacing it.
