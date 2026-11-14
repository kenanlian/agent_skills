# OpenCode adapter

## Subagent routing

| Route | OpenCode subagent |
| --- | --- |
| `explorer` | built-in `Explore` |
| `junior` worker | `junior-worker` |
| `senior` worker | `senior-worker` |
| `expert` worker | `expert-worker` |

Use `Explore` only for read-only repository evidence tasks. Pass the complete task contract to the selected subagent.

## Runtime configuration

The environment must provide the named worker agents and access compatible with the task contract. Worker definitions must deny nested subagent launches unless the caller and host configuration explicitly authorize a bounded nested task. Platform defaults do not expand task-specific write ownership.

Providers, models, variants, credentials, and agent definitions belong in local OpenCode configuration or dotfiles. Callers use semantic routes; model changes do not require editing this adapter.

## Correction and resume

Continue the existing child session using the host's available continuation mechanism. If that surface cannot resume the session, disclose the limitation under the common fallback policy.
