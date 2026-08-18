# Direction and role selection

## Build decision-changing directions

Start from the decision brief, not from a list of professions. Generate
candidate directions with these lenses, then remove any question whose answer
cannot change the decision, recommendation conditions, or next action.

| Lens | Question prompts |
| --- | --- |
| Outcome and user value | Who benefits, what problem changes, and how will success be observed? |
| Scope and alternatives | What is the smallest useful option? Are defer, experiment, buy, or adapt valid alternatives? |
| Architecture and feasibility | Where are the boundaries, dependencies, invariants, and scaling limits? |
| Experience and accessibility | How does the workflow, cognitive load, consistency, or accessibility change? |
| Data and security | What data, permissions, threats, privacy duties, or compliance constraints change? |
| Quality and reliability | What can fail, how is it detected, and how can behavior be tested and recovered? |
| Delivery and operations | What are the implementation, migration, deployment, observability, and on-call costs? |
| Economics and organization | What budget, vendor, staffing, ownership, or opportunity costs matter? |
| Evolution and exit | How reversible is the choice, what creates lock-in, and what triggers reevaluation? |
| Evidence | Which beliefs are unsupported, and what is the cheapest decisive validation? |

Write each retained direction in this form:

```markdown
### D<n>: <decision-changing question>
- Why it matters: <decision or condition it can change>
- Expected output: <comparison, boundary, failure modes, threshold, or evidence>
- Evidence needed: <verified inputs or None>
- Primary roles: <one or two owners>
- Priority: <high, medium, or low with a short reason>
```

Prioritize by decision impact, uncertainty, and difficulty of reversal. Avoid
fake numeric precision; qualitative priority is enough. Keep four to seven
directions unless the decision is exceptionally broad.

## Select roles dynamically

Cover three responsibilities first:

1. **Outcome owner:** test value, scope, and success criteria.
2. **Feasibility owner:** test implementation reality and architectural fit.
3. **Risk challenger:** search for failure modes, invalid assumptions, and exit
   conditions.

Add a role only when it owns a distinct criterion, evidence set, or failure
mode. Prefer three to six roles. Merge overlapping roles and assign each role
two to four primary directions rather than asking everyone to answer everything.

| Role lens | Primary responsibility | Add when | Bias to resist |
| --- | --- | --- | --- |
| Product manager | User value, scope, priority, success measures | Product behavior or roadmap changes | Treating more features as more value |
| User or customer advocate | Real workflows, adoption, switching cost | User impact is material or poorly represented | Inventing user needs without evidence |
| Software architect | Boundaries, dependencies, invariants, evolution | Architecture or technology choices are central | Overengineering for speculative scale |
| Implementation engineer | Code impact, complexity, team capability | Delivery feasibility or developer experience matters | Optimizing only for immediate convenience |
| Design engineer | Interaction, accessibility, system consistency | UI, API ergonomics, or workflows change | Prioritizing polish over task success |
| Test or quality engineer | Testability, edge cases, regression and failure | Behavior is complex or quality risk is material | Equating test count with confidence |
| SRE or operations | Deployment, observability, capacity, recovery | Production behavior or on-call load changes | Rejecting change solely to reduce operations |
| Security or privacy | Threats, authorization, exposure, abuse | Identities, sensitive data, trust boundaries, or external inputs change | Using generic security objections without a threat path |
| Data engineer | Models, migration, integrity, lineage | Persistent or analytical data changes | Treating schema concerns as isolated from product behavior |
| Delivery or business owner | Schedule, budget, staffing, vendors, ownership | Time, cost, procurement, or coordination constrains options | Turning estimates into false certainty |
| Skeptic | Strongest countercase and pre-mortem | Choice is costly, irreversible, or converging too easily | Contrarianism without a plausible trigger |
| Evidence reviewer | Claim quality, source coverage, decisive gaps | External facts or uncertain repository claims drive the choice | Demanding evidence that cannot affect the decision |

## Match roles to work

- Use an evidence scout instead of a role when the deliverable is a factual map,
  exhaustive search, version check, metric, or source summary.
- Use a role deliberator when the deliverable is a judgment against criteria and
  constraints.
- Let a role perform a bounded local lookup when it needs one fact to support its
  own judgment.
- Promote broad or shared investigation to a top-level evidence scout controlled
  by the parent agent.
- Do not use role count as confidence. Add evidence or a challenge lens when
  confidence is weak.

## Adapt scope to risk

| Decision shape | Suggested deliberation |
| --- | --- |
| Simple, reversible, low impact | Two or three lenses; no challenge wave |
| Moderate tradeoff with repository facts | Three or four roles plus shared evidence as needed |
| Cross-cutting or difficult to reverse | Four to six roles, evidence scouts, and targeted challenge |
| Security, data, compliance, or major spend | Add the relevant specialist lens and require real evidence or qualified human review |

Do not start a full roster merely because roles are available. The smallest set
that covers the decision criteria and material failure modes is the right set.
