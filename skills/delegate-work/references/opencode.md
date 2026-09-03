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

The `reviewer` remains source/worktree read-only but may launch bounded read-only exploration subagents when a review skill requests evidence gathering. Nested delegation from the reviewer is limited to explorer-style work: repository location, tracing, mapping, exhaustive/negative search, caller/consumer closure, behavioral traces, bypass sweeps, and verification-path discovery. The reviewer must not delegate review judgment, finding severity, contract status, design decisions, implementation/fixes, or the final verdict; it independently verifies material findings and owns every review conclusion.

For a normal review contract with `Access: read-only`, the reviewer writes nothing. For a persisted review contract with `Access: audit-write`, the runtime definition must allow the reviewer to create/write only the exact raw-review artifact path named in `Write ownership`; all source, plan, code, test, config, manifest, state, adjudication, and other paths remain non-writable.

If the installed OpenCode permission model cannot express or honor that narrow audit-write exception, treat persisted reviewer output as unsupported and return a persistence blocker. Do not broaden the reviewer to general workspace write access and do not silently fall back to parent-side transcription of a large raw report.

Task-specific worker ownership and reviewer audit ownership come from the common task contract. That contract may name exact pointers to stable artifacts instead of inlining their contents; the child resolves those pointers. OpenCode definitions provide platform-level safety defaults; they must not override a narrower contract.

## Runtime configuration boundary

Concrete provider selection, model IDs, variants, credentials, and OpenCode configuration files are environment configuration, not skill logic. Manage them outside this repository, preferably in dotfiles.

A compatible OpenCode environment must provide:

- built-in `Explore`;
- custom `junior-worker`, `senior-worker`, `expert-worker`, and `reviewer` agents;
- no nested subagent launch from custom workers;
- reviewer task delegation enabled only for bounded read-only exploration, with reviewer-owned final judgment;
- worker access consistent with the common task contract;
- reviewer source-read-only behavior plus exact-path audit-write support when persisted reviews are used;
- local provider/model routing chosen by the user; and
- Node 18+ available to run the resolve helper; if the helper is missing or cannot run, that is a configuration-error blocker, not a silent fallback.

Changing a model or provider must not require changing this adapter unless the logical OpenCode subagent interface itself changes.

## External reviewer backend

This section is an environment-configuration *read* convention. It does not change the rule that provider and model bindings stay out of `agent_skills`. Concrete command, argument, and model values live only in OpenCode environment files (dotfiles). This adapter names no provider, model, or runner-script identity.

### Scope

Applies only to the `reviewer` route. The `explorer` route and all worker routes are unchanged.

Configuration is keyed by role so a later worker external backend can reuse the same schema. This version activates the named-backend path for `reviewer` only. Do not route workers through it.

### Configuration discovery and priority

The dispatcher does not read or merge these files itself. It runs the helper script `skills/delegate-work/scripts/resolve-backend.mjs` (resolve the script path from this repository checkout):

```text
node <checkout>/skills/delegate-work/scripts/resolve-backend.mjs \
  --role reviewer \
  --repo <dispatch root> \
  --artifact <Raw Review Artifact contract value>
```

On a correction resume, also pass `--session <Session from the prior receipt>`. Route by the script's stdout JSON. Any exit 2 is a configuration-error blocker (fail closed; never fall back silently to `native` or to another backend).

The script's behavior contract follows.

Read, in this order (`--config-dir` defaults to `~/.config/opencode`):

1. `<config-dir>/delegation.json` (environment default; may be absent)
2. `<config-dir>/delegation.local.json` (untracked override; may be absent)

Treat a missing file as an empty object. A missing local file is normal.

Merge per role with a shallow overlay: local role-object keys replace default keys of the same name; the `backends` map merges by key (local entries replace default entries of the same backend name; other default backends remain).

`reviewer.backend` selects the route:

- absent, or the literal `native` → stdout `{"route":"native"}` (exactly one JSON line), exit 0. The dispatcher then uses the **Subagent routing** table above with no additional machinery. This is the zero-regression path.
- any other name → that name must exist in the merged `backends` map. The script substitutes placeholders as specified below and prints `{"route":"external","command":"...","args":[...]}`.

Fail closed as a configuration-error blocker (do not silently fall back to `native` or to another backend) when:

- either file exists but is not valid JSON; or
- `reviewer.backend` is set to a name other than `native` that has no definition in the merged `backends` map.

The script encodes those conditions as one stderr error line, exit 2, and nothing on stdout.

### Backend definition schema

Each `backends.<name>` object has:

- `command`: string
- `args`: array of strings

Placeholders, substituted by the script (not by the dispatcher) in the stored backend definition:

- `{repo}` → the `--repo` value verbatim (the dispatch working root in its original spelling, not a canonicalized real path)
- `{artifact}` → the `--artifact` value verbatim (the contract's `Raw Review Artifact` value, substituted exactly as written; absolute or relative spelling). Lexical normalization is the runner's job, not the script's.

On a correction resume, the dispatcher passes `--session <Session from the prior receipt>` to the script. The script appends `--session`, `<id>` to the END of the substituted `args`. The stored config never contains a session flag.

The runner CLI frozen by this section is exactly:

- `--cd <repo>` (required)
- `--artifact <path>` (required)
- `--model <id>` (required)
- `--session <id>` (optional; correction resume only)

No other runner inputs exist. Writable paths are derived inside the runner. The review contract travels on **stdin**, never argv.

### Native routing (zero regression)

When no configuration files exist, or after merge `reviewer.backend` is absent or `native`, reviewer dispatch is byte-for-byte the existing **Subagent routing** path: OpenCode `task` to the named `reviewer` subagent. Do not spawn an external command, do not add a transport addendum, and do not change compact-return or artifact-write behavior.

### Named-backend dispatch

**Fresh dispatch.** Concatenate, and send on stdin:

1. the complete `delegate-work` task contract, copied verbatim; then
2. a delimiter line `---TRANSPORT---` (exactly those 15 characters); then
3. the **External review transport** addendum defined below.

The runner must not modify, summarize, or re-wrap stdin.

**Correction resume** (invalid-return before persistence). Send only an incremental brief that names the concrete failure and the required correction. Do not resend the full contract. Continue the same backend session via `--session <prior receipt Session>`. This matches the common `delegate-work` resume rule.

The transport addendum is a task-specific requirement. Per `delegate-work` authority order, it overrides the cited review skill's "reviewer writes the raw artifact" protocol for this dispatch only. Review skill files themselves are not edited.

**Identity binding (runner, before spawn).**

- Fresh dispatch: stdin must contain a `Raw Review Artifact` field whose value is literally equal to the `--artifact` argument. Missing field or inequality → `Outcome: contract-violation`, exit 2, no review-process spawn and no artifact write. A dispatch without that field is not a persisted review; named backends refuse it.
- `--cd` is not bound separately: `--artifact` must already sit lexically under `--cd`.
- After the backend returns a session id (success or `invalid-return`), persist a minimal binding record under the derived transport directory (`sessionId`, exact `artifact` spelling, exact `--cd` spelling).
- `--session` resume: the derived transport directory must already contain that binding, and session id, artifact, and `--cd` must all match. Missing or mismatched binding → `Outcome: contract-violation`, exit 2, no spawn.

### External review transport (canonical addendum)

This subsection owns the addendum text. Dispatchers append it unchanged after `---TRANSPORT---`.

```text
You are running in a read-only external review process.
Do not create, modify, delete, or write any file.

The original contract's instruction that the reviewer persist the raw
review artifact does not apply to this dispatch. The caller persists
the report deterministically from your reply.

Your final reply must contain exactly two sections, in this order,
split by these literal delimiter lines and no others:

===COMPACT===
<compact return required by the review skill cited in the original contract>
===REPORT===
<complete raw report required by that same review skill, including its provenance frontmatter>

COMPACT is the compact return protocol of the cited review skill
(Outcome / Verdict / Confidence / Artifact / Findings index /
Evidence limitations, as that skill specifies).

REPORT is that skill's complete raw-report specification, including
provenance frontmatter.

Emit no text before ===COMPACT=== and no commentary wrapping the envelope.
```

### Reviewer output envelope

The external reviewer's final message must contain, and contain only, these two sections, split by literal delimiter lines:

```text
===COMPACT===
<review-skill compact return>
===REPORT===
<review-skill complete raw report, including provenance frontmatter>
```

Missing delimiter, wrong section order, extra delimiter, or extra delimiter occurrences → contract violation: the runner writes no artifact and returns `Outcome: invalid-return`. The dispatcher resumes the same session once with `--session`. A second failure is a blocker; do not switch backend.

**Correction lifecycle.** Correction exists only *before* persistence. Once the runner has exclusively written the artifact, that file is immutable. Any later resume or rerun against the same artifact path must return `Outcome: persistence-failure`. Content fixes after a successful write are a new review round with a new artifact path, not a correction resume.

### Artifact write (runner)

The review process itself is read-only. Only the deterministic runner writes the artifact.

**(0) Input normalization.** `--artifact` accepts the contract's exact value (absolute or relative spelling). An absolute spelling must sit lexically under the non-realpath `--cd` (`path.relative(--cd, input)` must not start with `..`); the runner derives the lexical repository-relative form and preserves a `.dev/...` original spelling. A relative spelling is used as given. A spelling that is not lexically under `--cd` — including a canonical target of a `.dev` symlink — is rejected (exit 2).

**(a) Lexical whitelist.** The normalized repository-relative path must match an audit path form: `.dev/plan-review/*/round-*-review.md` or `.dev/review/*/round-*-*.md`.

**(b) Canonical write containment.** Approved write roots are exactly `realpath(--cd)` and, when it exists, `realpath(--cd/.dev)` (the second root covers a `.dev` symlink onto an audit store). After canonical resolution the artifact must lie inside one of those roots. Escape through any other symlink component is rejected.

All three checks must pass. The runner then exclusively creates the artifact (`wx`: fail if the path exists) and writes the REPORT section *verbatim*. Validation failure or an existing file → no write, `Outcome: persistence-failure`. The receipt `Artifact` field reprints the contract's original exact value, not the normalized form.

The runner injects nothing into REPORT. Reviewer-supplied provenance may use `unknown` for model or reasoning fields.

Transport products are not CLI inputs. The runner derives `<directory-of-artifact>/transport/` internally. Aside from the contracted artifact and that `transport/` subdirectory, the audit directory gains no new files. Every writable path (artifact and transport) must pass canonical write containment. Approved roots are `realpath(--cd)` ∪ `realpath(--cd/.dev)`.

### Model pin

Before writing the artifact, the runner compares the resolved model identity in the backend result record with the requested `--model`. Mismatch → `Outcome: blocked`, no artifact write.

### Wrapper receipt (stdout)

```text
Outcome: completed | invalid-return | persistence-failure | contract-violation | blocked
Artifact: <exact path>
Session: <backend session id or None>
Model: <resolved model id or None>
Verification:
  - artifact-written: PASS | FAIL
  - model-match: PASS | FAIL
Blockers: <one line or None>
```

The compact section follows the receipt, separated by a `---` line, for the dispatcher to forward unchanged.

Exit codes:

- `0` — `completed`
- `2` — usage error, configuration error, or `contract-violation`
- `1` — run failure, including `invalid-return`, `persistence-failure`, and `blocked`
- `127` — the configured backend executable is missing (pass through the inner missing-binary exit)

### Failure and switching discipline

Any named-backend failure is a blocker raised to the caller. There is no runtime automatic fallback to `native` or to another backend.

Do not switch backend in the middle of a review cycle. A new backend has none of the prior rounds' session context. A switch happens only at a task or cycle boundary, and only when the user changes configuration.

Correction of an `invalid-return` uses `--session` to resume the same backend session, per the common resume rule.

## Correction and resume

When verification finds an error or the response violates the task contract, continue or resume the existing child session using the host's available continuation mechanism. Do not silently create a fresh replacement with lost context.

If the current OpenCode surface cannot resume the original child session, report that limitation under the common blocker policy rather than silently replacing it.
