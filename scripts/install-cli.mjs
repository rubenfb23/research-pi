#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
function run(exe, args) {
  const result = spawnSync(exe, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' && exe.endsWith('.cmd') });
  if (result.error) { console.error(`Could not start ${exe}: ${result.error.message}`); process.exit(1); }
  if (result.status !== 0) process.exit(result.signal === 'SIGINT' ? 130 : result.status ?? 1);
}
run(process.execPath, [join(root, 'repi'), 'setup']);
// npm owns the executable links and checks collisions; no sudo, force or shell edits.
run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['link', '--no-audit', '--no-fund']);
console.log('\nrepi installed in the npm prefix. From any directory: repi');
console.log('Help: repi --help · Connect: repi connect codex · Test: repi --offline');
console.log('Keep the checkout at this location. If your shell cannot find repi, check that the npm prefix executable directory is on PATH.');
