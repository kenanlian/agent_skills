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

This repository intentionally does not bind these routes to concrete providers or models. OpenCode user configuration owns the implementation of each named subagent and the model used by built-in `Explore`. Keep runtime choices in OpenCode configuration or dotfiles rather than `agent_skills`.

Plans, task DAGs, caller skills, and the common delegation contract must refer only to semantic role/tier or the logical OpenCode subagent name. They must not depend on provider names or model IDs.

## Required agent behavior

Use built-in `Explore` only for contracts classified as `explorer`; those tasks remain read-only and evidence-only.

The `junior-worker`, `senior-worker`, and `expert-worker` agents may perform either read-only or write tasks according to the common task contract. Their OpenCode definitions must deny nested subagent launches.

The `reviewer` must deny nested subagent launches and remain source/worktree read-only. For a normal review contract with `Access: read-only`, it writes nothing. For a persisted review contract with `Access: audit-write`, the runtime definition must allow the reviewer to create/write only the exact raw-review artifact path named in `Write ownership`; all source, plan, code, test, config, manifest, state, adjudication, and other paths remain non-writable.

If the installed OpenCode permission model cannot express or honor that narrow audit-write exception, treat persisted reviewer output as unsupported and return a persistence blocker. Do not broaden the reviewer to general workspace write access and do not silently fall back to parent-side transcription of a large raw report.

Task-specific worker ownership and reviewer audit ownership come from the common task contract. OpenCode definitions provide platform-level safety defaults; they must not override a narrower contract.

## Runtime configuration boundary

Concrete provider selection, model IDs, variants, credentials, and OpenCode configuration files are environment configuration, not skill logic. Manage them outside this repository, preferably in dotfiles.

A compatible OpenCode environment must provide:

- built-in `Explore`;
- custom `junior-worker`, `senior-worker`, `expert-worker`, and `reviewer` agents;
- no nested subagent launch from custom workers/reviewer;
- worker access consistent with the common task contract;
- reviewer source-read-only behavior plus exact-path audit-write support when persisted reviews are used; and
- local provider/model routing chosen by the user.

Changing a model or provider must not require changing this adapter unless the logical OpenCode subagent interface itself changes.

## Correction and resume

When verification finds an error or the response violates the task contract, continue or resume the existing child session using the host's available continuation mechanism. Do not silently create a fresh replacement with lost context.

If the current OpenCode surface cannot resume the original child session, report that limitation under the common blocker policy rather than silently replacing it.
