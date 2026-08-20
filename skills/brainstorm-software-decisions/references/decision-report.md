# Decision report

Write a decision record, not role-by-role meeting minutes. Preserve stable IDs
across rounds:

- `O<n>` for options;
- `D<n>` for discussion directions;
- `A<n>` for assumptions;
- `U<n>` for unknowns;
- `R<n>` for risks; and
- `DEC<n>` for accepted, rejected, deferred, or provisional decisions.

Use two layers. Put the answer and its decision boundaries in a compact summary;
put traceability, evidence, and history in the supporting workspace. Omit empty
sections and detailed role transcripts.

## Decision summary

```markdown
# Software decision report — Round <n>

## Decision summary

- Decision: <one exact question>
- Owner and deadline: <authority and timing>
- Desired outcome: <observable result>
- Readiness: <ready | conditionally ready | blocked by evidence |
  blocked by owner decision>
- Choose: <O ID, staged path, experiment, defer, or no justified choice>
- Because: <controlling criteria and verified basis>
- Largest unresolved risk: <R ID and consequence>

## Decision boundaries

- Preconditions: <what must be true before acting>
- Recommendation remains valid while: <important ranges or assumptions>
- Recommendation flips when: <threshold or changed assumption>
- Reconsider when: <observable signal and review point>
- Do not choose when: <veto or invalidating condition>

## Immediate next step

1. <highest-information or execution-enabling action>
2. <optional second>
3. <optional third>
```

Ask no more than three questions or actions. Each must name the conclusion it
could change or the transition it enables.

## Supporting decision workspace

Use the relevant sections below after the summary.

### Decision frame

```markdown
- Round change: <new user input or evidence>
- Hard constraints: <violations eliminate an option>
- Objectives and precedence: <ordered criteria or explicit tie-breaker>
- Veto conditions: <security, data, budget, compatibility, or authority vetoes>
- Time horizon and reversibility: <decision horizon and recovery cost>
- Out of scope: <deliberately excluded decisions>
```

### Option closure

```markdown
- Included: <O IDs and distinct paths>
- Merged: <candidate into O ID and why>
- Excluded: <candidate and violated constraint or dominance reason>
- Baselines considered: <status quo, defer, staged experiment as applicable>
- Remaining possibility gap: <None or exact uncertainty>
```

Do not silently add or remove options after the independent lens wave. Reopen
the closure explicitly when new evidence warrants it.

### Deliberation coverage

| Lens | Directions | Evidence scope | Evidence quality | Recommendation robustness |
| --- | --- | --- | --- | --- |
| <mission-oriented lens> | <D IDs> | <verified inputs and bounded lookups> | <high/medium/low and why> | <high/medium/low and flip condition> |

### Evidence ledger

| Claim | Status | Source or search coverage | Used by | Limitation |
| --- | --- | --- | --- | --- |
| <fact> | <confirmed/inferred/unverified> | <anchor, version, measurement, or locations searched> | <D/O/R IDs> | <coverage or freshness limit> |

### Option comparison

| Criterion | O1 | O2 | O3 | Evidence status |
| --- | --- | --- | --- | --- |
| <criterion> | <effect> | <effect> | <effect> | <confirmed/inferred/unverified> |

Explain hard-constraint elimination before objective tradeoffs. Do not calculate
totals unless the user supplied or approved meaningful weights.

### Evidence and judgment convergence

#### Shared verified facts
- <fact and source anchor>

#### Convergent judgments
- <judgment and criteria supporting it>

#### Conditional convergence
- <judgment that holds only if A<n> is true>

#### Same result, independent reasons
- <materially different reasoning paths>

#### Correlated assumptions
- <shared premise, its origin, and why agreement does not validate it>

### Material disagreements

| Issue | Positions | Root cause | Type | Resolution |
| --- | --- | --- | --- | --- |
| <issue> | <P1 versus P2> | <assumption/value/tradeoff> | <evidence/owner decision/irreducible tradeoff> | <check, choice, or condition> |

### Robustness and sensitivity

Keep these dimensions separate:

- Evidence quality: <reliability, coverage, and freshness of current facts>
- Forecast uncertainty: <uncertainty in future cost, load, adoption, or behavior>
- Recommendation robustness: <whether reasonable assumption changes preserve
  the choice>
- Most decision-sensitive variable: <A/U ID, plausible range, and flip point>
- Convergence challenge result: <failure narrative, warning signal, and change
  made or reason no change was justified>

### Assumptions and unknowns

| ID | Claim | Status and basis | Impact or flip condition | Resolution cost | Information value | Action |
| --- | --- | --- | --- | --- | --- | --- |
| A1/U1 | <claim> | <confirmed/inferred/unverified> | <decision effect> | <time/money/coordination> | <high/medium/low and why> | <resolve now/experiment/monitor/accept> |

Resolve an unknown now only when it has a realistic chance to change the
decision, its information can arrive before the deadline, and its resolution
cost is justified by the expected loss avoided. Prefer a bounded experiment to
another language-only round when it is the cheapest decisive check.

### Risks and failure modes

| ID | Trigger or early warning | Impact | Mitigation or fallback | Exit criterion | Owner |
| --- | --- | --- | --- | --- | --- |
| R1 | <observable signal> | <consequence> | <action> | <when to stop or reverse> | <person/role/TBD> |

### Deliberation independence

```markdown
- Context independence: <yes/partial/no>
- Evidence independence: <yes/partial/no and shared sources>
- Model-family independence: <yes/no/unknown>
- Human or domain-expert validation: <scope or None>
```

Do not imply that isolated contexts using the same model family provide
independent expertise.

### Decision log

| ID | Status | Decision | Basis | Revisit trigger |
| --- | --- | --- | --- | --- |
| DEC1 | <accepted/rejected/deferred/provisional> | <decision> | <reason> | <condition or None> |

## Planning handoff

When the user moves from deciding to planning, close the decision record and
return this packet to the planning workflow:

```markdown
Accepted decision: <DEC ID>
Selected option: <O ID>

Implementation invariants:
- <condition the plan must preserve>

Explicit non-goals:
- <behavior or scope the plan must not introduce>

Required validation before or during delivery:
- <benchmark, prototype, measurement, security review, or stakeholder check>

Risks that must become plan work:
- <R ID → mitigation, observation, or contingency task>

Rollout or adoption conditions:
- <entry threshold>

Rollback and exit conditions:
- <observable trigger and required action>

Open owner decisions:
- <None or exact unresolved choice>
```

The handoff carries accepted decisions forward; it does not reopen option
selection unless new evidence invalidates a recorded premise.

## Synthesis rules

- Base recommendations on constraints, criteria, and evidence, not lens count.
- Keep a minority argument when it identifies a plausible high-impact failure.
- Treat agreement dependent on an assumption as conditional convergence.
- Record shared unsupported premises as correlated assumptions.
- Distinguish evidence-resolvable disputes, owner decisions, forecasts, and
  irreducible tradeoffs.
- Prefer qualitative comparisons over invented scores.
- State uncertainty and recommendation flip conditions directly.

## Continue the next round

When the user responds:

1. Record the response under `Round change`.
2. Update affected facts, assumptions, constraints, options, and decisions.
3. Retain unchanged IDs and mark superseded items instead of silently deleting
   decision history.
4. Reopen option closure only when the change introduces or validates a
   materially different path.
5. Reopen only directions whose conclusions can change.
6. Resume relevant existing lenses when continuity helps; dispatch a new lens
   only for a newly introduced criterion, evidence set, or failure mode.
7. Produce a complete standalone summary and the supporting sections that
   changed materially.
