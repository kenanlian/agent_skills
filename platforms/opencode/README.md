# OpenCode delegation agents

The OpenCode adapter described by `skills/delegate-work/SKILL.md` uses the built-in `Explore` subagent for exploration and the custom agent definitions in this directory for tiered workers and review.

Install the four custom templates globally under `~/.config/opencode/agents/` or per project under `.opencode/agents/`. No custom explorer template is required.

Explorer routing is fixed semantically:

- `explorer` -> built-in `Explore` subagent for read-only repository evidence gathering

The repository does not bind a model for built-in `Explore`; OpenCode owns that subagent's model routing.

Each custom template intentionally leaves `model` commented out. After installation, set the model available in that OpenCode environment using the stable semantic mapping below:

- `junior-worker` -> low-cost, fast model for straightforward bounded work
- `senior-worker` -> default model for normal software engineering work
- `expert-worker` -> strongest model for complex, ambiguous, cross-module, or high-risk work
- `reviewer` -> strong independent review model, preferably different from the model that produced the work when practical

Provider and model choices for custom agents belong in these OpenCode agent definitions. Do not copy provider names into plans, task DAGs, or the common `delegate-work` task contract.

The three worker agents deny nested subagent launches. The reviewer additionally denies edits so it remains an independent read-only reviewer. Built-in `Explore` is used only for contracts classified by `delegate-work` as read-only exploration.
