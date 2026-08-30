# OpenCode delegation agents

The OpenCode adapter described by `skills/delegate-work/SKILL.md` uses the built-in `Explore` subagent for exploration and the custom agent definitions in this directory for tiered workers and review.

Install the four custom templates globally under `~/.config/opencode/agents/` or per project under `.opencode/agents/`. No custom explorer template is required.

The OpenCode model routing is fixed as follows:

- `explorer` -> built-in `Explore` -> `opencode-go/deepseek-v4-flash#high`
- `junior-worker` -> `opencode-go/deepseek-v4-flash#high`
- `senior-worker` -> `opencode-go/deepseek-v4-pro#high`
- `expert-worker` -> `openai/gpt-5.6-sol#high`
- `reviewer` -> `openai/gpt-5.6-sol#high`

The four custom agent templates bind their models directly in frontmatter. The built-in `Explore` subagent is overridden by the checked-in `opencode.jsonc` in this directory.

For a global setup, this file can be symlinked to OpenCode's global config location:

```bash
mkdir -p ~/.config/opencode
ln -s /absolute/path/to/agent_skills/platforms/opencode/opencode.jsonc ~/.config/opencode/opencode.jsonc
```

If `~/.config/opencode/opencode.jsonc` already exists, merge the `agent.explore` entry instead of replacing unrelated local settings. OpenCode merges configuration from multiple supported locations, so `OPENCODE_CONFIG` is also an option when a direct symlink is not desirable.

The custom agent Markdown files still need to be installed or symlinked under `~/.config/opencode/agents/` (or per-project `.opencode/agents/`).

`opencode-go` requires an active OpenCode Go connection. `openai/gpt-5.6-sol#high` assumes OpenAI is connected through the OpenCode OpenAI provider, including ChatGPT Plus/Pro OAuth where available.

Provider and model choices belong in the OpenCode platform adapter and agent definitions. Do not copy provider names into plans, task DAGs, or the common `delegate-work` task contract.

The three worker agents deny nested subagent launches. The reviewer additionally denies edits so it remains an independent read-only reviewer. Built-in `Explore` is used only for contracts classified by `delegate-work` as read-only exploration.
