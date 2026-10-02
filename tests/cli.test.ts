import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT } from '../src/paths.js';

test('Fresh onboarding and chat remain English under a Spanish terminal locale', () => {
  const project = mkdtempSync(join(tmpdir(), 'researchpi-english-'));
  const env = { ...process.env, LANG: 'es_ES.UTF-8', LC_ALL: 'es_ES.UTF-8', RESEARCH_PI_DATA_DIR: join(project, 'user-data') };
  const cli = (args: string[], input = '') => spawnSync(process.execPath,
    [join(ROOT, 'dist/cli.js'), '--project', project, ...args], { env, encoding: 'utf8', input, timeout: 20000 });
  try {
    const setup = cli(['connect'], 'invalid-choice\noffline\n');
    assert.equal(setup.status, 0, setup.stderr);
    assert.match(setup.stderr, /How would you like to connect ResearchPi\?/);
    assert.match(setup.stderr, /Claude · API key/);
    assert.match(setup.stderr, /sign in with ChatGPT/);
    assert.match(setup.stderr, /OpenCode Zen · API key/);
    assert.match(setup.stderr, /OpenCode Go · API key/);
    assert.match(setup.stderr, /Option \[1\]:/);
    assert.match(setup.stderr, /Enter a number or an identifier from the list/);
    assert.match(cli(['--help']).stdout, /ResearchPi: research with Claude, OpenAI or OpenCode on the Pi SDK/);
    const conversation = cli([], '/unknown\n[tool:project_status]\n/exit\n');
    assert.equal(conversation.status, 0, conversation.stderr);
    assert.match(conversation.stderr, /Project\s+/);
    assert.match(conversation.stderr, /Unknown command/);
    assert.match(conversation.stderr, /Tool: project_status/);
    assert.doesNotMatch(setup.stderr + conversation.stderr, /Cómo|Elige|Opción|Comando desconocido|Herramienta/);
    const error = cli(['model', 'missing-model']);
    assert.equal(error.status, 1);
    assert.match(error.stderr, /Unknown model/);
    assert.match(readFileSync(join(ROOT, 'resources/system.md'), 'utf8'), /Use English for all responses and generated scientific text/);
  } finally { rmSync(project, { recursive: true, force: true }); }
});

test('No-argument launch enters interactive chat, responds to multiple messages and resumes the transcript', () => {
  const project = mkdtempSync(join(tmpdir(), 'researchpi-cli-'));
  const cli = (...args: string[]) => spawnSync(process.execPath, [join(ROOT, 'dist/cli.js'), '--project', project, ...args],
    { encoding: 'utf8', input: 'hola\n/help\n[tool:project_status]\n/status\n/exit\n', timeout: 20000 });
  try {
    const first = cli('--offline');
    assert.equal(first.status, 0, first.stderr);
    assert.match(first.stdout, /OFFLINE TEST/); assert.match(first.stderr, /Tool: project_status/);
    assert.match(first.stderr, /\/connect/); assert.match(first.stderr, /scientificState/);
    const pointer = readFileSync(join(project, '.research-pi/session-pointer.json'), 'utf8');
    const second = cli('chat', '--offline', 'retomar');
    assert.equal(second.status, 0, second.stderr);
    assert.equal(readFileSync(join(project, '.research-pi/session-pointer.json'), 'utf8'), pointer);
    const path = JSON.parse(pointer).path;
    assert.match(readFileSync(path, 'utf8'), /retomar/);
  } finally { rmSync(project, { recursive: true, force: true }); }
});

test('API key onboarding refuses piped secrets and does not echo them', () => {
  const project = mkdtempSync(join(tmpdir(), 'researchpi-secret-'));
  try {
    const result = spawnSync(process.execPath, [join(ROOT, 'dist/cli.js'), '--project', project, 'connect', 'claude', '--model', 'claude-sonnet-4-6'],
      { encoding: 'utf8', input: 'replace\nsuper-secret-test-value\n', timeout: 20000 });
    assert.equal(result.status, 1);
    assert(![result.stdout, result.stderr].join('').includes('super-secret-test-value'));
    assert.match(result.stderr, /Connection setup did not complete/);
  } finally { rmSync(project, { recursive: true, force: true }); }
});
