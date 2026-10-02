import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT } from '../src/paths.js';

test('No-argument launch enters interactive chat, responds to multiple messages and resumes the transcript', () => {
  const project = mkdtempSync(join(tmpdir(), 'researchpi-cli-'));
  const cli = (...args: string[]) => spawnSync(process.execPath, [join(ROOT, 'dist/cli.js'), '--project', project, ...args],
    { encoding: 'utf8', input: 'hola\n/help\n[tool:project_status]\n/status\n/exit\n', timeout: 20000 });
  try {
    const first = cli('--offline');
    assert.equal(first.status, 0, first.stderr);
    assert.match(first.stdout, /OFFLINE TEST/); assert.match(first.stderr, /Herramienta: project_status/);
    assert.match(first.stderr, /\/connect/); assert.match(first.stdout, /scientificState/);
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
    assert.match(result.stderr, /No se completó la conexión/);
  } finally { rmSync(project, { recursive: true, force: true }); }
});
