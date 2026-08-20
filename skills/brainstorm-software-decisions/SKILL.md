---
name: brainstorm-software-decisions
description: Run iterative, evidence-grounded, multi-perspective deliberation for consequential software decisions such as architecture, technology stacks, migrations, build-versus-buy choices, data or security boundaries, and difficult-to-reverse delivery strategies. Use only when the user explicitly invokes it for a major tradeoff; routine and reversible decisions belong in direct discussion. Synthesize evidence, disagreements, assumptions, decision boundaries, risks, and next actions without presenting simulated lenses as real experts.
disable-model-invocation: true
---

# Brainstorm software decisions

Treat the workflow as structured decision assistance, not a virtual expert
committee. Use mission-oriented analysis lenses, not simulated personas. Never
imply that model agreement is expert validation or decide by vote.

This is a deep workflow for consequential decisions, not a default ideation
step. Do not dilute it into a lightweight path for routine, local, or readily
reversible choices. If the requested decision does not justify independent
evidence work, multiple lenses, or an explicit decision record, explain that
direct discussion is sufficient and do not run the workflow.

Keep the parent agent as the sole control plane. Own the decision frame, agenda,
delegation, shared evidence, cross-lens synthesis, verification of load-bearing
claims, and final report. Let subagents perform bounded evidence collection or
lens analysis; do not let them make the global decision.

## Load the working references

- Read [direction-and-role-selection.md](references/direction-and-role-selection.md)
  before closing options, setting the agenda, or selecting lenses.
- Read [subagent-contract.md](references/subagent-contract.md) before dispatching
  option scouts, evidence scouts, lens deliberators, or challenge work.
- Read [decision-report.md](references/decision-report.md) before producing or
  updating a round report.

## Run one deliberation round

### 1. Frame and qualify the decision

Turn the request and any previous round into a compact decision brief:

- the exact decision to make and the desired outcome;
- the decision owner, affected stakeholders, and decision deadline;
- hard constraints, primary objectives, precedence or tie-breakers, and veto
  conditions;
- preferences, time horizon, reversibility, and out-of-scope decisions;
- known options, including deferring or running an experiment when applicable;
- confirmed facts, inferred context, assumptions, and unknowns;
- the scope and desired outcome of this round.

Preserve stable option, assumption, unknown, risk, and decision IDs across
rounds. Separate hard constraints from objectives that can be traded. State
reasonable assumptions instead of blocking on non-critical gaps.

Before expensive delegation, perform a decision-frame checkpoint. Ask the user
only when an unresolved owner decision, criteria precedence, veto condition, or
scope boundary could change the leading option or make the investigation
unauthorized. Otherwise state the adopted frame and proceed.

### 2. Close the option set, build the agenda, and choose lenses

Follow the selection reference. Before evaluation, test whether the initial
option set omits a materially different path. Include status quo, defer, staged
adoption, or a decisive experiment when applicable. Use an independent option
scout only when repository or market discovery is needed. Then freeze the option
set for the first lens wave and record why candidates were included, merged, or
excluded. Reopen it only when new evidence invalidates the closure.

Express each direction as a decision-changing question with an expected output
and evidence need. Rank directions by decision impact, uncertainty, and
difficulty of reversal; normally keep four to seven.

Choose analysis lenses from the agenda rather than starting with a fixed roster.
Define each lens by a distinct criterion, evidence set, failure mode, or
disconfirmation task; use a professional role name only as shorthand. Normally
use three to six non-overlapping lenses. Cover outcome value, feasibility, and
risk, then add only lenses justified by the decision. Do not create a
lens-by-direction Cartesian product.

### 3. Establish shared evidence

Identify claims that require repository inspection, external research, metrics,
or stakeholder input. When several lenses need the same broad facts, dispatch
bounded read-only evidence scouts first and verify their material outputs before
the lens wave.

Allow a lens deliberator to inspect code, documentation, or tests when a local
fact is necessary for its assigned judgment. Require exact evidence and search
coverage for repository-grounded claims. If the investigation exceeds its
scope, require the lens to return an evidence gap instead of expanding work.

Verify directly every load-bearing public interface, data or security boundary,
negative claim, and disputed fact before relying on it in the recommendation.

### 4. Dispatch independent lens deliberation

Load and follow `delegate-work` for every dispatch. Classify evidence collection
as exploration or research and lens judgment as design, analysis, or review;
leave model and reasoning routing to that skill.

Give every lens the same verified decision brief plus a distinct, bounded
charter. Dispatch the first lens wave independently so one lens cannot anchor on
another's conclusion. Require each lens to expose assumptions, evaluate relevant
options, state the strongest opposing case, and describe what evidence would
change its position.

Use only platform-built-in subagents. Do not allow lens subagents to delegate
further. Promote any necessary broader work to a separate top-level evidence
scout controlled by the parent. Keep all deliberation read-only; do not
implement a candidate solution.

If subagents are unavailable, perform the lenses sequentially and disclose that
the result is a single-agent structured analysis rather than independent agent
deliberation.

### 5. Synthesize and challenge

Normalize factual claims as `confirmed`, `inferred`, or `unverified`, and label
lens judgments as `opinion`. Resolve conflicting facts before comparing
judgments.

Separate:

- shared facts from aligned judgments;
- unconditional agreement from conditional agreement;
- genuine agreement from identical conclusions reached for different reasons;
- evidence-resolvable disputes from preference or tradeoff disputes.

Do not average recommendations or count votes. Judge options against the stated
criteria and constraints. Preserve minority arguments when they expose a
high-impact failure mode.

For consequential unresolved disagreements, send only the compact disagreement
packet to the relevant existing lenses and ask them to address the strongest
opposing case. Add a dedicated skeptic or evidence reviewer only when it fills a
distinct gap.

Challenge convergence as well as disagreement. After a leading recommendation
emerges, run one bounded convergence challenge for a difficult-to-reverse
decision unless independent real-world validation already attacks its central
assumptions. Ask for the most plausible failure narrative, earliest warning
signal, correlated assumption, disconfirming evidence, and whether another
option fails more gracefully. Context independence among same-family models is
not expert or model-family independence.

Separate evidence quality, forecast uncertainty, and recommendation robustness;
do not compress them into one confidence label. Identify the assumption or
threshold most likely to flip the recommendation. Prefer an experiment over
another language-only round when a low-cost observation has high decision
leverage.

### 6. Report and hand control to the user

Use the report reference to produce a decision-oriented report rather than
role-by-role meeting notes. Give a conditional recommendation when evidence
supports one; otherwise state exactly what prevents a decision and the cheapest
way to resolve it.

Lead with a compact decision summary and keep detailed coverage, evidence, and
history in a supporting workspace. When the user moves to planning, produce the
handoff packet defined by the report reference so accepted constraints,
non-goals, validations, risks, and exit conditions survive the transition.

End with no more than three questions or actions that have the highest chance of
changing the decision. Wait for user input after the round unless the user
explicitly requested autonomous continuation and every next-round input is
already available.

## Continue or stop

On new user input, record what changed, retain unaffected IDs and evidence, and
rerun only impacted directions and lenses. Do not repeat the complete committee
by default.

Stop deliberation when any of these applies:

- the user accepts, rejects, or defers the decision;
- the remaining choice is explicitly a user preference or authority decision;
- an external experiment, measurement, or stakeholder answer is required;
- the recommendation is decision-ready with documented conditions and exit
  criteria;
- remaining unknowns have lower information value than their resolution cost;
- another round would add no material information; or
- a real qualified reviewer is required for a high-risk conclusion.

When the user asks to move from deciding to planning or implementation, close
the decision record and hand off to the applicable planning or execution
workflow. Do not silently cross that boundary.
