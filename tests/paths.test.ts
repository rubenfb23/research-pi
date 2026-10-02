import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { userDataDirectory, installationDataDirectory, pythonVenvDirectory } from '../src/paths.js';

test('Installed application data follows each OS user directory, independent of the project', () => {
  const home = '/users/tester';
  assert.equal(userDataDirectory('linux', {}, home), join(home, '.local/share/research-pi'));
  assert.equal(userDataDirectory('linux', { XDG_DATA_HOME: '/data' }, home), '/data/research-pi');
  assert.equal(userDataDirectory('linux', { XDG_DATA_HOME: 'relative' }, home), join(home, '.local/share/research-pi'));
  assert.equal(userDataDirectory('darwin', {}, home), join(home, 'Library/Application Support/ResearchPi'));
  assert.equal(userDataDirectory('win32', { LOCALAPPDATA: '/user-local' }, home), '/user-local/ResearchPi');
});

test('Explicit user data override controls connections and Python but rejects a relative directory', () => {
  const previous = process.env.RESEARCH_PI_DATA_DIR;
  try {
    process.env.RESEARCH_PI_DATA_DIR = '/explicit-data';
    assert.equal(installationDataDirectory(), '/explicit-data');
    assert.equal(pythonVenvDirectory(), '/explicit-data/.venv');
    process.env.RESEARCH_PI_DATA_DIR = 'relative';
    assert.throws(() => installationDataDirectory(), /absolute path/);
  } finally {
    if (previous === undefined) delete process.env.RESEARCH_PI_DATA_DIR;
    else process.env.RESEARCH_PI_DATA_DIR = previous;
  }
});
