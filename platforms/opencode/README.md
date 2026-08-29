# OpenCode delegation agents

These agent definitions implement the OpenCode adapter described by `skills/delegate-work/SKILL.md`.

Install the four templates globally under `~/.config/opencode/agents/` or per project under `.opencode/agents/`.

Each template intentionally leaves `model` commented out. After installation, set the model available in that OpenCode environment using the stable semantic mapping below:

- `junior-worker` -> low-cost, fast model for straightforward bounded work
- `senior-worker` -> default model for normal software engineering work
- `expert-worker` -> strongest model for complex, ambiguous, cross-module, or high-risk work
- `reviewer` -> strong independent review model, preferably different from the model that produced the work when practical

Provider and model choices belong in these OpenCode agent definitions. Do not copy provider names into plans, task DAGs, or the common `delegate-work` task contract.

The three worker agents deny nested subagent launches. The reviewer additionally denies edits so it remains an independent read-only reviewer.
