# Subagent contracts

Use these payloads inside the complete task contract required by
`delegate-work`. Do not copy its platform model table into this skill. Keep all
work read-only and set `Required skill: None` unless a real domain skill applies.

## Shared decision brief

Provide every scout or lens only the stable context it needs:

```markdown
Decision: <one exact question>
Desired outcome: <observable result>
Decision owner and deadline: <authority and timing>
Stakeholders: <affected groups>
Options: <O1, O2, ...>
Option closure: <included, merged, excluded, and remaining gap>
Hard constraints and vetoes: <non-negotiable boundaries>
Objectives and precedence: <ordered criteria or explicit tie-breaker>
Verified facts: <facts with source anchors>
Assumptions and unknowns: <A1, U1, ...>
Assigned directions: <D1, D2, ...>
Round scope: <included and excluded decisions>
```

Never label user speculation as a verified fact. Pass distilled verified scout
outputs to lens deliberators instead of raw logs.

## Option scout payload

Use only when finding materially different options requires repository or
external discovery:

```markdown
Task: Discover feasible decision paths omitted from the initial option set.

Initial options: <O IDs and summaries>
Hard constraints and vetoes: <non-negotiable boundaries>
Search scope: <repository areas, ecosystem, vendors, or migration boundaries>

Requirements:
- Use read-only inspection.
- Find materially different paths, not cosmetic variants.
- Consider the current state and staged or experimental paths when feasible.
- Characterize dependencies, constraint conflicts, and evidence gaps.
- Do not rank options, recommend one, expand the decision scope, or delegate.

Return:
1. Candidate options and what makes each distinct.
2. Evidence and search coverage.
3. Candidates that duplicate or compose with existing options.
4. Constraint conflicts and feasibility unknowns.
5. Remaining possibility gap.
```

Classify this work as exploration or research when following `delegate-work`.

## Evidence scout payload

Give a scout one explicit evidence question and require a bounded answer:

```markdown
Task: Establish <one factual question> for the shared decision brief.

Included scope:
- <directories, sources, symbols, versions, or behaviors>

Excluded scope:
- option recommendation, role judgment, implementation, and unrelated systems

Requirements:
- Use read-only inspection.
- Distinguish confirmed, inferred, and unverified claims.
- Return exact paths, symbols, source versions, or measurements.
- For negative claims, state aliases, string forms, and locations searched.
- Report contradictions and evidence limitations.
- Do not delegate further or expand scope.

Return:
1. Direct answer.
2. Evidence and search coverage.
3. Evidence quality and limitations.
4. Facts safe to add to the shared brief.
5. Remaining evidence gaps, their decision leverage, and cheapest resolution.
```

Classify this work as exploration or research when following `delegate-work`.

## Lens deliberator payload

Give every lens the same shared brief and a distinct responsibility:

```markdown
Analysis lens: <mission-oriented name; optional professional shorthand>
Mission: Evaluate or try to disconfirm the options from <owned criteria,
evidence set, failure mode, or challenge>.
Primary directions: <two to four D IDs>
Bias to resist: <lens-specific failure tendency>

Authority:
- Recommend conditionally from this lens.
- Inspect only the assigned code, documentation, tests, or sources when needed.
- Do not make the global decision, implement a solution, expand scope, or
  delegate further.
- Return an evidence gap when broader investigation is required.

Requirements:
- Evaluate relevant options against the stated criteria and constraints.
- Mark factual claims confirmed, inferred, or unverified; label lens judgments
  as opinion.
- Cite exact evidence for repository- or source-grounded claims.
- Identify assumptions and the consequences if they are false.
- Describe plausible risks with triggers, impact, mitigation, and exit criteria.
- State the strongest opposing case to the current inclination.
- Explain what evidence or user preference would change the conclusion.
- Separate evidence quality, forecast uncertainty, and recommendation
  robustness. Do not infer any of them from agreement with other lenses.

Return:
1. Lens conclusion and recommendation robustness.
2. Option assessment.
3. Key reasons, evidence, and evidence quality.
4. Assumptions, unknowns, and forecast uncertainty.
5. Risks and failure modes.
6. Strongest opposing case.
7. Conditional recommendation.
8. Decision-changing evidence gaps.
```

Classify this work as design, analysis, or review when following
`delegate-work`. Dispatch the first lens wave independently without other lens
conclusions.

## Targeted disagreement challenge

Resume the relevant existing lens when its context is useful. Send a compact,
neutral disagreement packet rather than complete lens transcripts:

```markdown
Disagreement: <one issue>
Position P1: <claim, reasons, and assumptions>
Position P2: <claim, reasons, and assumptions>
Shared evidence: <only verified facts>
Unresolved point: <evidence, preference, or tradeoff>

Reassess your prior conclusion:
- Address the strongest opposing argument directly.
- Identify any assumption you would revise.
- State whether the disagreement is resolvable by evidence.
- Propose the cheapest decisive check or a clear decision condition.
- Preserve your lens boundary and do not delegate further.
```

Challenge only high-impact disagreements. Do not run another full lens wave by
default.

## Convergence challenge payload

Run this after synthesis for a difficult-to-reverse decision unless independent
real-world evidence already challenges the central assumptions. Give the
challenger the recommendation and its strongest basis, not complete lens
transcripts:

```markdown
Leading recommendation: <option and conditions>
Controlling reasons: <criteria and verified evidence>
Shared assumptions: <A IDs>
Known uncertainties: <U IDs>

Assume this recommendation failed materially within the decision horizon.
Return:
1. The most plausible causal failure narrative.
2. The earliest observable warning signal.
3. The correlated assumption or framing error that could fool every lens.
4. The cheapest evidence that could disconfirm the recommendation now.
5. Whether another option degrades or recovers more gracefully.
6. Whether the recommendation, conditions, or exit criteria should change.

Do not object generically, invent unsupported facts, or repeat already-mitigated
risks. Do not delegate further.
```
