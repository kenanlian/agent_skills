import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const helper = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'resolve-backend.mjs');

function tempConfigDir(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'resolve-backend-'));
  t.after(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });
  return dir;
}

function writeJson(dir, name, value) {
  fs.writeFileSync(path.join(dir, name), `${JSON.stringify(value, null, 2)}\n`);
}

function writeRaw(dir, name, contents) {
  fs.writeFileSync(path.join(dir, name), contents);
}

function run(configDir, extra = []) {
  return spawnSync(
    process.execPath,
    [
      helper,
      '--role',
      extra.role || 'reviewer',
      '--repo',
      extra.repo || '/tmp/dispatch-root',
      '--artifact',
      extra.artifact || '.dev/review/demo/round-01-review.md',
      ...(extra.session !== undefined ? ['--session', extra.session] : []),
      '--config-dir',
      configDir,
      ...(extra.flags || []),
    ],
    { encoding: 'utf8' },
  );
}

function runRaw(argv) {
  return spawnSync(process.execPath, [helper, ...argv], { encoding: 'utf8' });
}

function parseStdout(result) {
  assert.equal(result.status, 0, result.stderr);
  const lines = result.stdout.split('\n');
  const nonempty = lines.filter((line) => line !== '');
  assert.equal(nonempty.length, 1, result.stdout);
  assert.equal(result.stdout, `${nonempty[0]}\n`);
  return JSON.parse(nonempty[0]);
}

function assertConfigError(result) {
  assert.equal(result.status, 2, result.stderr);
  assert.equal(result.stdout, '');
  assert.ok(result.stderr.trim().length > 0);
}

const namedBackends = {
  reviewer: {
    backend: 'codex',
    backends: {
      codex: {
        command: 'review-runner',
        args: ['--cd', '{repo}', '--artifact', '{artifact}', '--model', 'pinned'],
      },
    },
  },
};

test('no config files at all → native', (t) => {
  const dir = tempConfigDir(t);
  assert.deepEqual(parseStdout(run(dir)), { route: 'native' });
});

test('default file with reviewer.backend absent → native', (t) => {
  const dir = tempConfigDir(t);
  writeJson(dir, 'delegation.json', {
    reviewer: {
      backends: {
        codex: { command: 'review-runner', args: ['--cd', '{repo}'] },
      },
    },
  });
  assert.deepEqual(parseStdout(run(dir)), { route: 'native' });
});

test('backend: "native" explicitly → native', (t) => {
  const dir = tempConfigDir(t);
  writeJson(dir, 'delegation.json', {
    reviewer: {
      backend: 'native',
      backends: {
        codex: { command: 'review-runner', args: ['--cd', '{repo}'] },
      },
    },
  });
  assert.deepEqual(parseStdout(run(dir)), { route: 'native' });
});

test('named backend substitutes {repo}/{artifact} verbatim with no canonicalization', (t) => {
  const dir = tempConfigDir(t);
  writeJson(dir, 'delegation.json', namedBackends);
  const repo = '/tmp/does-not-exist/my-project/.dev';
  const artifact = '.dev/review/abc/round-01-review.md';
  const result = parseStdout(run(dir, { repo, artifact }));
  assert.deepEqual(result, {
    route: 'external',
    command: 'review-runner',
    args: ['--cd', repo, '--artifact', artifact, '--model', 'pinned'],
  });
  assert.equal(result.args[1], repo);
  assert.equal(result.args[3], artifact);
});

test('--session appends at the end of args; omitted otherwise', (t) => {
  const dir = tempConfigDir(t);
  writeJson(dir, 'delegation.json', namedBackends);
  const without = parseStdout(run(dir));
  assert.equal(without.args.includes('--session'), false);

  const withSession = parseStdout(run(dir, { session: 'sess-abc' }));
  assert.deepEqual(withSession.args.slice(-2), ['--session', 'sess-abc']);
  assert.deepEqual(withSession.args, [
    '--cd',
    '/tmp/dispatch-root',
    '--artifact',
    '.dev/review/demo/round-01-review.md',
    '--model',
    'pinned',
    '--session',
    'sess-abc',
  ]);
});

test('local overlay merges role keys and backends map', (t) => {
  const dir = tempConfigDir(t);
  writeJson(dir, 'delegation.json', {
    reviewer: {
      backend: 'alpha',
      note: 'from-default',
      backends: {
        alpha: { command: 'cmd-alpha', args: ['default-alpha', '{repo}'] },
        bravo: { command: 'cmd-bravo', args: ['keep-bravo'] },
      },
    },
  });
  writeJson(dir, 'delegation.local.json', {
    reviewer: {
      backend: 'charlie',
      note: 'from-local',
      backends: {
        alpha: { command: 'cmd-alpha-local', args: ['overridden-alpha'] },
        charlie: { command: 'cmd-charlie', args: ['local-only', '{artifact}'] },
      },
    },
  });

  const localOnly = parseStdout(run(dir));
  assert.deepEqual(localOnly, {
    route: 'external',
    command: 'cmd-charlie',
    args: ['local-only', '.dev/review/demo/round-01-review.md'],
  });

  writeJson(dir, 'delegation.local.json', {
    reviewer: {
      backend: 'bravo',
      note: 'from-local',
      backends: {
        alpha: { command: 'cmd-alpha-local', args: ['overridden-alpha'] },
        charlie: { command: 'cmd-charlie', args: ['local-only', '{artifact}'] },
      },
    },
  });
  const survivingDefault = parseStdout(run(dir));
  assert.deepEqual(survivingDefault, {
    route: 'external',
    command: 'cmd-bravo',
    args: ['keep-bravo'],
  });

  writeJson(dir, 'delegation.local.json', {
    reviewer: {
      backend: 'alpha',
      note: 'from-local',
      backends: {
        alpha: { command: 'cmd-alpha-local', args: ['overridden-alpha'] },
        charlie: { command: 'cmd-charlie', args: ['local-only', '{artifact}'] },
      },
    },
  });
  const overridden = parseStdout(run(dir));
  assert.deepEqual(overridden, {
    route: 'external',
    command: 'cmd-alpha-local',
    args: ['overridden-alpha'],
  });
});

test('role other than reviewer with no config entry → native', (t) => {
  const dir = tempConfigDir(t);
  writeJson(dir, 'delegation.json', namedBackends);
  assert.deepEqual(parseStdout(run(dir, { role: 'explorer' })), { route: 'native' });
  assert.deepEqual(parseStdout(run(tempConfigDir(t), { role: 'junior' })), { route: 'native' });
});

test('invalid JSON in default file → exit 2, empty stdout', (t) => {
  const dir = tempConfigDir(t);
  writeRaw(dir, 'delegation.json', '{ not json');
  assertConfigError(run(dir));
});

test('invalid JSON in local file → exit 2, empty stdout', (t) => {
  const dir = tempConfigDir(t);
  writeJson(dir, 'delegation.json', namedBackends);
  writeRaw(dir, 'delegation.local.json', '{ not json');
  assertConfigError(run(dir));
});

test('backend name missing from merged backends → exit 2, empty stdout', (t) => {
  const dir = tempConfigDir(t);
  writeJson(dir, 'delegation.json', {
    reviewer: {
      backend: 'ghost',
      backends: {
        codex: { command: 'review-runner', args: ['--cd', '{repo}'] },
      },
    },
  });
  assertConfigError(run(dir));
});

test('missing required flag / unknown flag → exit 2', (t) => {
  const dir = tempConfigDir(t);

  assertConfigError(runRaw(['--repo', '/tmp/r', '--artifact', '/tmp/a', '--config-dir', dir]));
  assertConfigError(runRaw(['--role', 'reviewer', '--artifact', '/tmp/a', '--config-dir', dir]));
  assertConfigError(runRaw(['--role', 'reviewer', '--repo', '/tmp/r', '--config-dir', dir]));
  assertConfigError(runRaw([
    '--role',
    'reviewer',
    '--repo',
    '/tmp/r',
    '--artifact',
    '/tmp/a',
    '--config-dir',
    dir,
    '--unknown',
    'x',
  ]));
  assertConfigError(runRaw([
    '--role',
    '',
    '--repo',
    '/tmp/r',
    '--artifact',
    '/tmp/a',
    '--config-dir',
    dir,
  ]));
});
