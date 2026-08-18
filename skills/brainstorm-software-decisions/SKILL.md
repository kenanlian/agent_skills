---
name: brainstorm-software-decisions
description: Run iterative, evidence-grounded, multi-perspective deliberation for software decisions. Use when the user asks to brainstorm or choose among development directions, feature approaches, architectures, technology stacks, migrations, build-versus-buy options, delivery strategies, or other consequential engineering tradeoffs; synthesize consensus, disagreement, assumptions, risks, and next-round questions without presenting simulated roles as real experts.
---

# Brainstorm software decisions

Treat the workflow as structured decision assistance, not a virtual expert
committee. Use roles as distinct review lenses. Never imply that model agreement
is expert validation or decide by vote.

Keep the parent agent as the sole control plane. Own the decision frame, agenda,
delegation, shared evidence, cross-role synthesis, verification of load-bearing
claims, and final report. Let subagents perform bounded evidence collection or
role analysis; do not let them make the global decision.

## Load the working references

- Read [direction-and-role-selection.md](references/direction-and-role-selection.md)
  before setting the agenda or selecting roles.
- Read [subagent-contract.md](references/subagent-contract.md) before dispatching
  evidence scouts, role deliberators, or challenge work.
- Read [decision-report.md](references/decision-report.md) before producing or
  updating a round report.

## Run one deliberation round

### 1. Frame the decision

Turn the request and any previous round into a compact decision brief:

- the exact decision to make and the desired outcome;
- users, stakeholders, and success criteria;
- hard constraints, preferences, time horizon, and reversibility;
- known options, including deferring or running an experiment when applicable;
- confirmed facts, inferred context, assumptions, and unknowns;
- the scope and desired outcome of this round.

Preserve stable option, assumption, unknown, risk, and decision IDs across
rounds. State reasonable assumptions instead of blocking on non-critical gaps.
Ask before dispatch only when a missing preference or authority would materially
change the agenda or create an unsafe expansion of scope.

### 2. Build the agenda and choose roles

Follow the selection reference. Express each direction as a decision-changing
question with an expected output and evidence need. Rank directions by decision
impact, uncertainty, and difficulty of reversal; normally keep four to seven.

Choose roles from the agenda rather than starting with a fixed roster. Normally
use three to six non-overlapping lenses. Cover outcome value, feasibility, and
risk, then add only roles justified by the decision. Do not create a
role-by-direction Cartesian product.

### 3. Establish shared evidence

Identify claims that require repository inspection, external research, metrics,
or stakeholder input. When several roles need the same broad facts, dispatch
bounded read-only evidence scouts first and verify their material outputs before
the role wave.

Allow a role deliberator to inspect code, documentation, or tests when a local
fact is necessary for its assigned judgment. Require exact evidence and search
coverage for repository-grounded claims. If the investigation exceeds its
scope, require the role to return an evidence gap instead of expanding work.

Verify directly every load-bearing public interface, data or security boundary,
negative claim, and disputed fact before relying on it in the recommendation.

### 4. Dispatch independent role deliberation

Load and follow `delegate-work` for every dispatch. Classify evidence collection
as exploration or research and role judgment as design, analysis, or review;
leave model and reasoning routing to that skill.

Give every role the same verified decision brief plus a distinct, bounded role
charter. Dispatch the first role wave independently so one role cannot anchor on
another's conclusion. Require each role to expose assumptions, evaluate relevant
options, state the strongest opposing case, and describe what evidence would
change its position.

Use only platform-built-in subagents. Do not allow role subagents to delegate
further. Promote any necessary broader work to a separate top-level evidence
scout controlled by the parent. Keep all deliberation read-only; do not
implement a candidate solution.

If subagents are unavailable, perform the lenses sequentially and disclose that
the result is a single-agent structured analysis rather than independent agent
deliberation.

### 5. Synthesize and challenge

Normalize factual claims as `confirmed`, `inferred`, or `unverified`, and label
role judgments as `opinion`. Resolve conflicting facts before comparing
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
packet to the relevant existing roles and ask them to address the strongest
opposing case. Add a dedicated skeptic or evidence reviewer only when it fills a
distinct gap. Skip this challenge wave for simple, reversible, low-risk choices.

### 6. Report and hand control to the user

Use the report reference to produce a decision-oriented report rather than
role-by-role meeting notes. Give a conditional recommendation when evidence
supports one; otherwise state exactly what prevents a decision and the cheapest
way to resolve it.

End with no more than three questions or actions that have the highest chance of
changing the decision. Wait for user input after the round unless the user
explicitly requested autonomous continuation and every next-round input is
already available.

## Continue or stop

On new user input, record what changed, retain unaffected IDs and evidence, and
rerun only impacted directions and roles. Do not repeat the complete committee
by default.

Stop deliberation when any of these applies:

- the user accepts, rejects, or defers the decision;
- the remaining choice is explicitly a user preference or authority decision;
- an external experiment, measurement, or stakeholder answer is required;
- the recommendation is decision-ready with documented conditions and exit
  criteria;
- another round would add no material information; or
- a real qualified reviewer is required for a high-risk conclusion.

When the user asks to move from deciding to planning or implementation, close
the decision record and hand off to the applicable planning or execution
workflow. Do not silently cross that boundary.
