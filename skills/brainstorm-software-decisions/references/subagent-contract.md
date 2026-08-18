# Subagent contracts

Use these payloads inside the complete task contract required by
`delegate-work`. Do not copy its platform model table into this skill. Keep all
work read-only and set `Required skill: None` unless a real domain skill applies.

## Shared decision brief

Provide every scout or role only the stable context it needs:

```markdown
Decision: <one exact question>
Desired outcome: <observable result>
Stakeholders: <affected groups>
Options: <O1, O2, ...>
Criteria: <ordered or explicitly unranked criteria>
Constraints: <hard constraints and preferences>
Verified facts: <facts with source anchors>
Assumptions and unknowns: <A1, U1, ...>
Assigned directions: <D1, D2, ...>
Round scope: <included and excluded decisions>
```

Never label user speculation as a verified fact. Pass distilled verified scout
outputs to role deliberators instead of raw logs.

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
3. Confidence and limitations.
4. Facts safe to add to the shared brief.
5. Remaining evidence gaps.
```

Classify this work as exploration or research when following `delegate-work`.

## Role deliberator payload

Give every role the same shared brief and a distinct responsibility:

```markdown
Role lens: <role name>
Mission: Evaluate the options from <owned criteria and responsibilities>.
Primary directions: <two to four D IDs>
Bias to resist: <role-specific failure tendency>

Authority:
- Recommend conditionally from this lens.
- Inspect only the assigned code, documentation, tests, or sources when needed.
- Do not make the global decision, implement a solution, expand scope, or
  delegate further.
- Return an evidence gap when broader investigation is required.

Requirements:
- Evaluate relevant options against the stated criteria and constraints.
- Mark factual claims confirmed, inferred, or unverified; label role judgments
  as opinion.
- Cite exact evidence for repository- or source-grounded claims.
- Identify assumptions and the consequences if they are false.
- Describe plausible risks with triggers, impact, mitigation, and exit criteria.
- State the strongest opposing case to the current inclination.
- Explain what evidence or user preference would change the conclusion.
- Do not infer confidence from agreement with other roles.

Return:
1. Lens conclusion and confidence.
2. Option assessment.
3. Key reasons and evidence.
4. Assumptions and unknowns.
5. Risks and failure modes.
6. Strongest opposing case.
7. Conditional recommendation.
8. Decision-changing evidence gaps.
```

Classify this work as design, analysis, or review when following
`delegate-work`. Dispatch the first role wave independently without other role
conclusions.

## Targeted challenge payload

Resume the relevant existing role when its context is useful. Send a compact,
neutral disagreement packet rather than complete role transcripts:

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
- Preserve your role boundary and do not delegate further.
```

Challenge only high-impact disagreements. Do not run another full role wave by
default.
