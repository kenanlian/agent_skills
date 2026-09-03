#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const USAGE =
  'usage: resolve-backend.mjs --role <role> --repo <path> --artifact <path> [--session <id>] [--config-dir <dir>]';

const ALLOWED_FLAGS = new Set(['role', 'repo', 'artifact', 'session', 'config-dir']);

function fail(message) {
  console.error(message);
  process.exit(2);
}

function usage() {
  fail(USAGE);
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function asObject(value) {
  return isPlainObject(value) ? value : {};
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) usage();
    const key = token.slice(2);
    if (!ALLOWED_FLAGS.has(key)) usage();
    if (Object.prototype.hasOwnProperty.call(out, key)) usage();
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) usage();
    out[key] = next;
    i += 1;
  }
  return out;
}

function required(args, key) {
  const value = args[key];
  if (value === undefined || value === '') usage();
  return value;
}

function readConfigFile(filePath) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    if (err && err.code === 'ENOENT') return {};
    fail(`cannot read ${filePath}`);
  }
  try {
    return JSON.parse(raw);
  } catch {
    fail(`invalid JSON: ${filePath}`);
  }
}

function mergeRole(defaultRoot, localRoot, role) {
  const defaultRole = asObject(asObject(defaultRoot)[role]);
  const localRole = asObject(asObject(localRoot)[role]);
  return {
    ...defaultRole,
    ...localRole,
    backends: {
      ...asObject(defaultRole.backends),
      ...asObject(localRole.backends),
    },
  };
}

function substitute(template, repo, artifact) {
  return template.split('{repo}').join(repo).split('{artifact}').join(artifact);
}

function resolveNamedBackend(definition, repo, artifact, session) {
  if (!isPlainObject(definition)) fail('invalid backend definition');
  if (typeof definition.command !== 'string') fail('backend command must be a string');
  if (!Array.isArray(definition.args)) fail('backend args must be an array');
  const command = substitute(definition.command, repo, artifact);
  const args = definition.args.map((arg) => {
    if (typeof arg !== 'string') fail('backend args must be strings');
    return substitute(arg, repo, artifact);
  });
  if (session !== undefined) {
    args.push('--session', session);
  }
  return { route: 'external', command, args };
}

function main(argv) {
  const args = parseArgs(argv);
  const role = required(args, 'role');
  const repo = required(args, 'repo');
  const artifact = required(args, 'artifact');
  if (Object.prototype.hasOwnProperty.call(args, 'session') && args.session === '') {
    usage();
  }
  if (Object.prototype.hasOwnProperty.call(args, 'config-dir') && args['config-dir'] === '') {
    usage();
  }

  const configDir = args['config-dir'] || path.join(os.homedir(), '.config', 'opencode');
  const defaults = readConfigFile(path.join(configDir, 'delegation.json'));
  const local = readConfigFile(path.join(configDir, 'delegation.local.json'));
  const resolved = mergeRole(defaults, local, role);
  const backend = resolved.backend;

  if (backend === undefined || backend === 'native') {
    process.stdout.write(`${JSON.stringify({ route: 'native' })}\n`);
    return;
  }

  if (typeof backend !== 'string') fail(`invalid backend for role '${role}'`);
  const definition = asObject(resolved.backends)[backend];
  if (definition === undefined) fail(`unknown backend '${backend}' for role '${role}'`);

  const result = resolveNamedBackend(definition, repo, artifact, args.session);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

main(process.argv.slice(2));
