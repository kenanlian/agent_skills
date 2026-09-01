#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  if (!command) fail('missing command');
  const args = { _: [] };
  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (!token.startsWith('--')) {
      args._.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = rest[i + 1];
    if (next === undefined || next.startsWith('--')) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return { command, args };
}

function required(args, key) {
  const value = args[key];
  if (value === undefined || value === true || value === '') fail(`missing --${key}`);
  return value;
}

function readText(file) {
  return fs.readFileSync(file, 'utf8');
}

function atomicWrite(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(temp, content, 'utf8');
  fs.renameSync(temp, file);
}

function loadPayload(args) {
  if (args['content-file']) return readText(args['content-file']);
  if (args.text !== undefined && args.text !== true) return args.text;
  return fs.readFileSync(0, 'utf8');
}

function findSectionRange(content, heading) {
  const lines = content.split('\n');
  const start = lines.findIndex((line) => line.trimEnd() === heading);
  if (start < 0) fail(`section not found: ${heading}`);
  const level = (heading.match(/^#+/) || [''])[0].length;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    const match = lines[i].match(/^(#+)\s/);
    if (match && match[1].length <= level) {
      end = i;
      break;
    }
  }
  return { lines, start, end };
}

function normalizeBody(text) {
  return text.replace(/^\n+|\n+$/g, '');
}

function escapeRegExp(value) {
  const special = new Set(['\\', '^', '$', '.', '*', '+', '?', '(', ')', '[', ']', '{', '}', '|']);
  return [...value].map((char) => (special.has(char) ? `\\${char}` : char)).join('');
}

function commandCopy(args) {
  const source = required(args, 'source');
  const dest = required(args, 'dest');
  if (fs.existsSync(dest)) fail(`destination already exists: ${dest}`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(source, dest, fs.constants.COPYFILE_EXCL);
}

function commandWrite(args) {
  const file = required(args, 'file');
  if (args.exclusive && fs.existsSync(file)) fail(`destination already exists: ${file}`);
  atomicWrite(file, loadPayload(args));
}

function commandSetFrontmatter(args) {
  const file = required(args, 'file');
  const key = required(args, 'key');
  const value = required(args, 'value');
  const content = readText(file);
  if (!content.startsWith('---\n')) fail('file has no YAML frontmatter');
  const close = content.indexOf('\n---\n', 4);
  if (close < 0) fail('unterminated YAML frontmatter');
  const frontmatter = content.slice(4, close).split('\n');
  const index = frontmatter.findIndex((line) => line.startsWith(`${key}:`));
  if (index < 0) fail(`frontmatter key not found: ${key}`);
  frontmatter[index] = `${key}: ${value}`;
  atomicWrite(file, `---\n${frontmatter.join('\n')}\n---\n${content.slice(close + 5)}`);
}

function commandSetField(args) {
  const file = required(args, 'file');
  const field = required(args, 'field');
  const value = required(args, 'value');
  const lines = readText(file).split('\n');
  const index = lines.findIndex((line) => line.startsWith(`${field}:`));
  if (index < 0) fail(`field not found: ${field}`);
  lines[index] = `${field}: ${value}`;
  atomicWrite(file, lines.join('\n'));
}

function commandSetListItem(args) {
  const file = required(args, 'file');
  const section = required(args, 'section');
  const label = required(args, 'label');
  const value = required(args, 'value');
  const content = readText(file);
  const { lines, start, end } = findSectionRange(content, section);
  let index = -1;
  for (let i = start + 1; i < end; i += 1) {
    if (lines[i].startsWith(`- ${label}:`)) {
      index = i;
      break;
    }
  }
  if (index < 0) fail(`list item not found in ${section}: ${label}`);
  lines[index] = `- ${label}: ${value}`;
  atomicWrite(file, lines.join('\n'));
}

function commandAppendSection(args) {
  const file = required(args, 'file');
  const section = required(args, 'section');
  const payload = normalizeBody(loadPayload(args));
  const content = readText(file);
  const { lines, end } = findSectionRange(content, section);
  const insertion = payload ? ['', ...payload.split('\n'), ''] : [];
  lines.splice(end, 0, ...insertion);
  atomicWrite(file, lines.join('\n'));
}

function commandReplaceSection(args) {
  const file = required(args, 'file');
  const section = required(args, 'section');
  const payload = normalizeBody(loadPayload(args));
  const content = readText(file);
  const { lines, start, end } = findSectionRange(content, section);
  const replacement = [section, '', ...payload.split('\n'), ''];
  lines.splice(start, end - start, ...replacement);
  atomicWrite(file, lines.join('\n'));
}

function commandUpsertTableRow(args) {
  const file = required(args, 'file');
  const section = required(args, 'section');
  const key = required(args, 'key');
  const row = required(args, 'row');
  if (!row.trim().startsWith('|')) fail('--row must be a Markdown table row');
  const content = readText(file);
  const { lines, start, end } = findSectionRange(content, section);
  let tableStart = -1;
  let tableEnd = -1;
  for (let i = start + 1; i < end; i += 1) {
    if (lines[i].trim().startsWith('|')) {
      if (tableStart < 0) tableStart = i;
      tableEnd = i + 1;
    } else if (tableStart >= 0 && lines[i].trim() !== '') {
      break;
    }
  }
  if (tableStart < 0) fail(`Markdown table not found in ${section}`);
  const keyPattern = new RegExp(`^\\|\\s*${escapeRegExp(key)}\\s*\\|`);
  let rowIndex = -1;
  for (let i = tableStart + 2; i < tableEnd; i += 1) {
    if (keyPattern.test(lines[i])) {
      rowIndex = i;
      break;
    }
  }
  if (rowIndex >= 0) lines[rowIndex] = row;
  else lines.splice(tableEnd, 0, row);
  atomicWrite(file, lines.join('\n'));
}

const { command, args } = parseArgs(process.argv.slice(2));
const commands = {
  copy: commandCopy,
  write: commandWrite,
  'set-frontmatter': commandSetFrontmatter,
  'set-field': commandSetField,
  'set-list-item': commandSetListItem,
  'append-section': commandAppendSection,
  'replace-section': commandReplaceSection,
  'upsert-table-row': commandUpsertTableRow,
};

const handler = commands[command];
if (!handler) fail(`unknown command: ${command}`);
handler(args);
