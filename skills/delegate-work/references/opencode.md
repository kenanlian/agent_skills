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

This repository intentionally does not bind these routes to concrete providers or models. OpenCode user configuration owns the implementation of each named subagent and the model used by built-in `Explore`. Keep those runtime choices in the user's OpenCode configuration or dotfiles rather than in `agent_skills`.

Plans, task DAGs, caller skills, and the common delegation contract must refer only to the semantic role/tier or the logical OpenCode subagent name. They must not depend on provider names or model IDs.

## Required agent behavior

Use built-in `Explore` only for contracts classified as `explorer`; the common contract requires those tasks to remain read-only and evidence-only.

The `junior-worker`, `senior-worker`, and `expert-worker` agents may perform either read-only or write tasks according to the common task contract. Their OpenCode definitions must deny nested subagent launches.

The `reviewer` must remain read-only and must deny nested subagent launches.

Task-specific worker write ownership and access always come from the common task contract. The OpenCode agent definitions provide platform-level safety defaults; they do not override a narrower task contract.

## Runtime configuration boundary

Concrete provider selection, model IDs, variants, credentials, and OpenCode configuration files are environment configuration, not skill logic. Manage them outside this repository, preferably in the user's dotfiles.

A compatible OpenCode environment must provide:

- the built-in `Explore` agent;
- custom `junior-worker`, `senior-worker`, `expert-worker`, and `reviewer` agents;
- the permission defaults described above; and
- whatever local provider/model routing the user chooses for those agents.

Changing a model or provider must not require changing this adapter unless the logical OpenCode subagent interface itself changes.

## Correction and resume

When verification finds an error or the response violates the task contract, continue or resume the existing child session using the host's available continuation mechanism. Do not silently create a fresh replacement with lost context.

If the current OpenCode surface cannot resume the original child session, report that limitation under the common blocker policy rather than silently replacing it.
