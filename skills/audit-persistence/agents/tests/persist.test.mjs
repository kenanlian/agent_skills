import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const here = path.dirname(fileURLToPath(import.meta.url));
const helper = path.resolve(here, '..', 'persist.mjs');

function run(args, input = '') {
  const result = spawnSync(process.execPath, [helper, ...args], {
    encoding: 'utf8',
    input,
  });
  return result;
}

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'audit-persistence-'));
}

test('copy creates an immutable exact snapshot', () => {
  const dir = tempDir();
  const source = path.join(dir, 'plan.md');
  const dest = path.join(dir, 'review', 'round-01-plan.md');
  fs.writeFileSync(source, '# Plan\n\nC1\n');

  const first = run(['copy', '--source', source, '--dest', dest]);
  assert.equal(first.status, 0, first.stderr);
  assert.equal(fs.readFileSync(dest, 'utf8'), '# Plan\n\nC1\n');

  fs.writeFileSync(source, '# Plan\n\nC2\n');
  const second = run(['copy', '--source', source, '--dest', dest]);
  assert.notEqual(second.status, 0);
  assert.equal(fs.readFileSync(dest, 'utf8'), '# Plan\n\nC1\n');
});

test('updates execution state without rewriting unrelated sections', () => {
  const dir = tempDir();
  const file = path.join(dir, 'execution.md');
  fs.writeFileSync(file, `# Execution state: Demo

Status: in-progress
Updated: t0

## Work packages

| ID | Status | Executor | Changed files | Focused verification |
| --- | --- | --- | --- | --- |
| WP-01 | pending | — | — | — |

## Deviations and blockers

- None

## Review gate

- User choice: pending
- Patch review: Not selected

## Completion

- Pending
`);

  assert.equal(run(['set-field', '--file', file, '--field', 'Status', '--value', 'fixing-review-findings']).status, 0);
  assert.equal(run(['upsert-table-row', '--file', file, '--section', '## Work packages', '--key', 'WP-01', '--row', '| WP-01 | verified | senior-worker | src/a.ts | V1 pass |']).status, 0);
  assert.equal(run(['set-list-item', '--file', file, '--section', '## Review gate', '--label', 'Patch review', '--value', 'incorrect, round 1']).status, 0);
  assert.equal(run(['append-section', '--file', file, '--section', '## Deviations and blockers'], '- WP-02: decision-escalation — compatibility choice requires user direction').status, 0);

  const content = fs.readFileSync(file, 'utf8');
  assert.match(content, /Status: fixing-review-findings/);
  assert.match(content, /\| WP-01 \| verified \| senior-worker \| src\/a\.ts \| V1 pass \|/);
  assert.match(content, /- Patch review: incorrect, round 1/);
  assert.match(content, /WP-02: decision-escalation/);
  assert.doesNotMatch(content, /## Deviations and blockers\n\n- None/);
  assert.match(content, /## Completion\n\n- Pending/);
});

test('updates manifest frontmatter and replaces round placeholder on first append', () => {
  const dir = tempDir();
  const file = path.join(dir, 'manifest.md');
  fs.writeFileSync(file, `---
rounds: 0
cycle_status: active
final_verdict: pending
---

# Review manifest

## Rounds

- Pending

## Final summary

- Pending
`);

  assert.equal(run(['set-frontmatter', '--file', file, '--key', 'rounds', '--value', '1']).status, 0);
  assert.equal(run(['append-section', '--file', file, '--section', '## Rounds'], '- Round 1: APPROVE; review=round-01-review.md; adjudication=round-01-adjudication.md').status, 0);

  const content = fs.readFileSync(file, 'utf8');
  assert.match(content, /^---\nrounds: 1\ncycle_status: active/m);
  assert.match(content, /Round 1: APPROVE/);
  assert.doesNotMatch(content, /## Rounds\n\n- Pending/);
  assert.match(content, /## Final summary\n\n- Pending/);
});
