# Decision report

Write a decision workspace, not role-by-role meeting minutes. Preserve stable
IDs across rounds:

- `O<n>` for options;
- `D<n>` for discussion directions;
- `A<n>` for assumptions;
- `U<n>` for unknowns;
- `R<n>` for risks; and
- `DEC<n>` for accepted, rejected, deferred, or provisional decisions.

Use only sections that carry information. Keep detailed role transcripts out of
the report.

## Report template

```markdown
# Software decision report — Round <n>

## Current decision state

- Decision: <exact question>
- Desired outcome: <observable result>
- Round change: <new user input or evidence since the previous round>
- Constraints: <hard constraints and important preferences>
- Options: <O1, O2, ...>
- Decision readiness: <ready | conditionally ready | blocked by evidence |
  blocked by user preference>

## Deliberation coverage

| Lens | Assigned directions | Evidence scope | Confidence |
| --- | --- | --- | --- |
| <role lens> | <D IDs> | <verified inputs and bounded lookups> | <high/medium/low and why> |

## Executive synthesis

<Current recommendation or exact reason no recommendation is justified. State
the controlling criteria, most important condition, and largest risk.>

## Option comparison

| Criterion | O1 | O2 | O3 | Evidence status |
| --- | --- | --- | --- | --- |
| <criterion> | <effect> | <effect> | <effect> | <confirmed/inferred/unverified> |

<Explain weighting or precedence. Avoid totals unless weights come from the
user and the inputs support quantitative scoring.>

## Consensus

### Shared facts
- <confirmed fact and source anchor>

### Aligned judgments
- <judgment and the criteria supporting it>

### Conditional agreement
- <agreement that holds only if A<n> is true>

### Same conclusion, different reasons
- <preserve materially different reasons instead of calling this full consensus>

## Material disagreements

| Issue | Positions | Root cause | Type | Resolution |
| --- | --- | --- | --- | --- |
| <issue> | <P1 versus P2> | <assumption/value/tradeoff> | <evidence/preference/tradeoff> | <check, user choice, or condition> |

## Assumptions and unknowns

| ID | Claim | Status and basis | Impact if false | Decisive check |
| --- | --- | --- | --- | --- |
| A1/U1 | <claim> | <confirmed/inferred/unverified> | <decision effect> | <measurement, search, interview, or experiment> |

## Risks and failure modes

| ID | Trigger | Impact | Mitigation or fallback | Owner |
| --- | --- | --- | --- | --- |
| R1 | <observable trigger> | <consequence> | <action or exit> | <role/person/TBD> |

## Recommendation

- Choose: <option, staged path, experiment, defer, or no justified choice>
- Because: <criteria and verified basis>
- Preconditions: <what must be true before acting>
- Reconsider when: <observable thresholds or changed assumptions>
- Do not choose when: <conditions that invalidate the recommendation>

## Next step

1. <highest-value action or question>
2. <optional second>
3. <optional third>

## Decision log

| ID | Status | Decision | Basis | Revisit trigger |
| --- | --- | --- | --- | --- |
| DEC1 | <accepted/rejected/deferred/provisional> | <decision> | <reason> | <condition or None> |
```

## Synthesis rules

- Base recommendations on criteria, constraints, and evidence, not role count.
- Keep a minority argument when it identifies a plausible high-impact failure.
- Separate facts from judgments even when every role agrees.
- Treat agreement dependent on an assumption as conditional agreement.
- Describe whether a disagreement is resolvable by evidence, requires a user
  preference, or represents an unavoidable tradeoff.
- Prefer qualitative comparisons over invented scores. Use weighted matrices
  only when the user supplies or approves the weights.
- Recommend an experiment when its cost is lower than the expected cost of
  deciding under uncertainty.
- State uncertainty directly; do not hide it behind a confident narrative.

## Continue the next round

When the user responds:

1. Record the response under `Round change`.
2. Update affected facts, assumptions, constraints, options, and decisions.
3. Retain unchanged IDs and mark superseded items instead of silently deleting
   decision history.
4. Reopen only directions whose conclusions can change.
5. Resume relevant existing roles when continuity helps; dispatch a new role
   only for a newly introduced lens.
6. Produce a complete standalone report for the new round.

Ask at most three questions. Each must name the conclusion it could change;
otherwise omit it.
