import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { completeChat } from '../src/input-completion.js';
import { InputHistory, historyLimit } from '../src/input-history.js';
import { ROOT } from '../src/paths.js';

const context = { providers: ['claude', 'codex', 'offline'], models: ['glm-5.3', 'glm-5.3-flash'], thinking: ['off', 'high'] };
test('Completion follows current command arguments and model/effort catalogs, without changing prose', () => {
  assert.deepEqual(completeChat('/h', context), [['/help'], '/h']);
  assert.deepEqual(completeChat('/mo', context), [['/model', '/models'], '/mo']);
  assert.deepEqual(completeChat('/connect co', context), [['/connect codex'], '/connect co']);
  assert.deepEqual(completeChat('/model glm-5', context), [['/model glm-5.3', '/model glm-5.3-flash'], '/model glm-5']);
  assert.deepEqual(completeChat('/thinking ', context), [['/thinking off', '/thinking high'], '/thinking ']);
  assert.deepEqual(completeChat('/reasoning o', context), [['/reasoning on', '/reasoning off'], '/reasoning o']);
  assert.deepEqual(completeChat('Explain this model', context), [[], 'Explain this model']);
  assert.deepEqual(completeChat('/model unavailable', context), [[], '/model unavailable']);
});

test('Project history bounds and deduplicates entries, handles invalid storage and merges other sessions', () => {
  const directory = mkdtempSync(join(tmpdir(), 'repi-history-'));
  try {
    const first = new InputHistory(directory), second = new InputHistory(directory);
    first.remember('A question'); second.remember('Another question'); first.remember('A question');
    assert.deepEqual(new InputHistory(directory).entries, ['A question', 'Another question']);
    for (const invalid of ['', ' ', ' secret omitted', 'bad\x1b[2J', 'multi\nline']) first.remember(invalid);
    assert.deepEqual(new InputHistory(directory).entries, ['A question', 'Another question']);
    for (let i = 0; i < historyLimit + 2; i++) first.remember('Question ' + i);
    assert.equal(new InputHistory(directory).entries.length, historyLimit);
    const file = join(directory, '.research-pi/input-history.json');
    writeFileSync(file, '{invalid'); assert.deepEqual(new InputHistory(directory).entries, []);
    first.remember('Recover history'); assert(JSON.parse(readFileSync(file, 'utf8')).includes('Recover history'));
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('Actual terminal keys complete, recall history across sessions, restore drafts and exclude secrets', { skip: process.platform === 'win32' }, () => {
  const result = spawnSync('python3', [join(ROOT, 'scripts/test-terminal-pty.py'), process.execPath], { encoding: 'utf8', timeout: 60000 });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  assert.match(result.stdout, /PTY verified/);
});
