---
name: design-ui
description: Review or implement UI and UX changes using the repository's design system, accessible interaction states, responsive behavior, and deliberate visual hierarchy. Use for interface design, visual refinement, accessibility, or design review.
---

# Design UI

Review or implement UI with a coherent design system, accessible interaction states, and deliberate visual hierarchy. Follow the assigned task mode: remain advisory for review work; edit and verify for implementation work.

## Design-system-first workflow

1. Before proposing or editing UI, inspect existing tokens, themes, shared primitives, and several representative components.
2. Reuse established naming, spacing, typography, color, and composition patterns.
3. If no coherent system exists, establish only the minimal tokens and primitives required for the task.
4. Use tokens rather than hard-coded colors, scale values rather than arbitrary spacing, and shared primitives rather than one-off component structures.
5. When independent codebase mapping would materially help, follow `delegate-work` and dispatch a built-in read-only subagent with explicit component scope and evidence requirements.

## Implementation

- Identify a clear aesthetic direction that fits the product.
- Cover loading, empty, error, disabled, hover, and focus states where applicable.
- Verify semantic HTML, keyboard operation, focus visibility, contrast, and responsive behavior.
- Keep changes minimal and consistent with repository conventions. Do not create documentation unless asked.
- Return changed files, implemented states, accessibility checks, and observed verification results.

## Review

Remain advisory. Report concrete, file-and-line-cited issues and specific remedies without editing files. Prioritize hierarchy, consistency, interaction states, accessibility, and responsive behavior.

Avoid decorative glassmorphism, generic gradients, arbitrary magic values, repeated card grids, modal overuse, and other templated visual patterns. Aim for clear hierarchy and intentional composition.
