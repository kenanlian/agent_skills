# OpenCode delegation agents

The OpenCode adapter described by `skills/delegate-work/SKILL.md` uses the built-in `Explore` subagent for exploration and the custom agent definitions in this directory for tiered workers and review.

Install the four custom templates globally under `~/.config/opencode/agents/` or per project under `.opencode/agents/`. No custom explorer template is required.

The OpenCode model routing is fixed as follows:

- `explorer` -> built-in `Explore` -> `opencode-go/deepseek-v4-flash#high`
- `junior-worker` -> `opencode-go/deepseek-v4-flash#high`
- `senior-worker` -> `opencode-go/deepseek-v4-pro#high`
- `expert-worker` -> `openai/gpt-5.6-sol#high`
- `reviewer` -> `openai/gpt-5.6-sol#high`

The four custom agent templates bind their models directly in frontmatter. The built-in `Explore` subagent must be overridden in OpenCode configuration because it has no checked-in custom template. Configure it like this:

```jsonc
{
  "agent": {
    "explore": {
      "model": "opencode-go/deepseek-v4-flash#high"
    }
  }
}
```

`opencode-go` requires an active OpenCode Go connection. `openai/gpt-5.6-sol#high` assumes OpenAI is connected through the OpenCode OpenAI provider, including ChatGPT Plus/Pro OAuth where available.

Provider and model choices belong in the OpenCode platform adapter and agent definitions. Do not copy provider names into plans, task DAGs, or the common `delegate-work` task contract.

The three worker agents deny nested subagent launches. The reviewer additionally denies edits so it remains an independent read-only reviewer. Built-in `Explore` is used only for contracts classified by `delegate-work` as read-only exploration.
