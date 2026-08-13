---
name: write-behavior-tests
description: Add or improve high-signal tests for concrete, externally observable behavior. Use when implementing regression or contract coverage; reject vacuous tests and run focused verification.
---

# Write behavior tests

Write tests only when they defend a concrete, externally observable contract and would fail for a plausible real defect.

## Before writing tests

1. Study the exact public API, relevant error paths, and existing test conventions. When the module or test patterns are unfamiliar, follow `delegate-work` for a bounded read-only investigation and require exact paths, symbols, and evidence.
2. Identify the observable behavior, invariants, state transitions, error mapping, boundaries, precedence, or regression-prone parsing the change should defend.
3. Reuse the repository's framework, file layout, naming, assertion style, fixtures, and fakes.
4. If no high-value contract is introduced or uncovered, write no test and explain why.

## Test standards

- Prefer black-box tests through public APIs. Use white-box tests only for a private invariant with no observable surface.
- Test semantic values and behavior, not implementation structure or mock call plumbing.
- Prefer real deterministic dependencies; otherwise use small hand-written fakes at true external boundaries.
- Keep tests deterministic, hermetic, order-independent, and free from real network, timing races, global leaks, and environment pollution.
- Use table-driven cases, subtests, properties, fuzzing, benchmarks, or golden outputs only when they fit a real contract.
- Test a default only when its externally observable behavior is an explicit compatibility or security contract.

## Never write

- Source-text grep tests, tautologies, bare no-throw checks, construction smoke tests, mock round-trips, or existence-only assertions.
- Setter/getter echoes, field-wiring assertions, duplicate-layer coverage, or tests that merely restate implementation.
- Tests whose success would survive a plausible flipped condition, off-by-one error, wrong value, or dropped case.

## Verification and return

Run the tests added or touched with the repository's focused test command. Verify each test has teeth by reasoning through a plausible failure or using a safe temporary perturbation when practical. Do not run the full suite unless asked.

Return:

1. Completion status and the contract each test covers.
2. Files changed and the tests added or updated.
3. The plausible defect each test would catch.
4. Test commands and observed results.
5. Any reason no test was added or any remaining limitation.
